import { Socket } from 'net';
import { handshakeMessage, interestedMessage, blockRequestMessage, writePiece } from './functions';
import { torrentMetadata, piece, block } from './declarations';
import { EventEmitter } from 'events';
import { isMainThread } from 'worker_threads';
import { timingSafeEqual } from 'crypto';

export class peer extends EventEmitter {
    constructor(ip: string, port: number, metadata: torrentMetadata, peerId: string){ 
        super();

        this.ip = ip;
        this.port = port;
        this.client = new Socket(); //Handles packet level transmission
        this.torrentMetadata = metadata;
        this.peerId = peerId;
        this.recvHandshake = false;
        this.recvBlockData = false; //Are we currently processing TCP packets as data of a block?
        this.downloadingPiece = false;
        this.choked = true;

        this.client.on('data', (data) => {
            this.handleRecvData(data);
        })
    }

    ip: string;
    port: number;
    client: Socket;
    recvHandshake: boolean;
    choked: boolean;
    torrentMetadata: torrentMetadata;
    peerId: string;

    recvBlockData: boolean;
    recvBlockIndex: number;
    recvBlock: block; //The block we are about to receive.
    recvBuffer: Buffer;
    thePiece: piece;
    downloadingPiece: boolean;
    recvBufferPosition: number; //Which byte to write to, in case of multiple TCP packets for a 16KiB block

    requestBlock = () => {
        this.recvBlockData = false;
        //Check if this.recvBlockIndex is valid in the context of this.thePiece.blocks
        //If it is, lets ask for it.

        if (this.recvBlockIndex < this.thePiece.blocks.length){
            //Its a valid block that exists.
            //Lets request it.
            this.recvBlock = this.thePiece.blocks[this.recvBlockIndex];
            console.log(`[BLOCK INFO] Size: ${this.recvBlock.size} bytes.`)
            this.recvBuffer = Buffer.alloc(this.recvBlock.size, 0); //0x00000000000000000000
            this.recvBufferPosition = 0;
            // this.recvBlockData = 
            console.log(`\n[REUQESTING] Piece #${this.thePiece.number} Block #${this.recvBlockIndex}`)
            this.client.write(blockRequestMessage(this.thePiece.number, this.recvBlock.start, this.recvBlock.size));
        } else if (this.recvBlockIndex == this.thePiece.blocks.length){
            //We got all the blocks bois.

            //Write the piece to disk
            //Tell the client its complete.
            // writePiece(this.thePiece.number, this.thePiece, 
            //this.thePiece.data is full of data to write.
            this.downloadingPiece = false;
            // this.recvBlockData = false;
            this.emit('piece_complete', this.thePiece);
        }
    }

    downloadPiece = (thePiece: piece): void => {
        if (this.downloadingPiece){
            //Already in the middle of a download
            this.emit('busy', thePiece.number);
            return;
        }

        this.downloadingPiece = true; //No more requests.
        this.thePiece = thePiece;
        this.thePiece.data = Buffer.alloc(this.thePiece.size, 0); //zeroed buffer for now.

        this.recvBlockIndex = 0;
        this.recvBlock = this.thePiece.blocks[this.recvBlockIndex];

        this.requestBlock();

        // this.client.write(blockRequestMessage(this.thePiece.number, this.recvBlock.start, this.recvBlock.size));


        //We need to request the different blocks in this piece, write each block to the right buffer in piece.
        // thePiece.data = Buffer.alloc(0, )
    }

    connect = (): void => {      
        this.client.connect(this.port, this.ip, () => {
            console.log(`[TCP] Conneted to remote @ ${this.ip}:${this.port}`);
            this.client.write(handshakeMessage(this.torrentMetadata.infohash, this.peerId));
            console.log("[TCP] Sent Bittorrent Handshake...");
        });
    }

    handleRecvData = (data: Buffer): void => {

        if (data.length <= 4){
            //Probably bitfield or some shit. Lets just ignore it.
            //Actually if length is 4 and data is 0x00000000 its keepalive. gg
            return;
        }

        if (!this.recvHandshake){
            if (data.length >= 68){
                let protocolLength = data.readInt8(0);

                if (protocolLength != 19){
                    return; //kill?
                }

                let protocolName = data.subarray(1, 20).toString();
                if (protocolName != "BitTorrent protocol"){
                    return; //kill?
                }

                //We ignore the reserved bytes 21 - 28 cause fuck it.

                let infoHash = data.subarray(28, 48).toString('hex');

                if (infoHash.toLowerCase() != this.torrentMetadata.infohash.toLowerCase()){
                    return; //kill?
                }

                let peerId = data.subarray(48, 68).toString('hex');

                //Not sure what to do with this for now.
                //Anyway valid handshake. Lets go
                console.log(`[BT] Received handshake!`);
                this.recvHandshake = true;
                //this.emit('HSC'); //Hand Shake Complete - let the controller know we got a legit peer to ask shit from
                //Or should we first say that we're interested and wait for unchoke
                console.log(`[BT] Telling peer we're interested`);
                this.client.write(interestedMessage());
                return; //TODO: Extended handshake
            } else {
                return; //kill?
            }
        }

        if (!this.recvBlockData){

            let messageLength = data.subarray(0, 4).readInt32BE(0);
            let messageId = data.readInt8(4);

            if (messageLength == 1 && messageId == 1){
                //Unchoked
                this.choked = false;
                console.log(`[BT] Unchoked by peer!`);
                this.emit('unchoked'); //Now we're really ready to request and receive shit
                return;
            } else if (messageId == 7 && this.downloadingPiece){

                //Got piece receival metadata
                //Lets confirm the pieceId and offset?
                let pieceIndex = data.subarray(5, 9).readInt32BE(0);
                let pieceOffset = data.subarray(9, 13).readInt32BE(0); //16384, 32768... 16KiB

                console.log(`[BLOCK METADATA] Piece #${this.thePiece.number} Block #${this.recvBlockIndex}`);
                console.log(`[RECV METADATA] Piece Index #${pieceIndex} Piece Offset #${pieceOffset}`);

                if (pieceIndex == this.thePiece.number && pieceOffset == this.recvBlock.start){
                    this.recvBlockData = true;
                    //It is the correct stuff.
                    //The amount of data is equal to messageLength - 9 bytes for the bittorrent metadata.
                    let blockDataLen = messageLength - 9;
                    
                    //Read this into our block buffer.
                    //this.recvBuffer should be zeroed out when we make the request.
                    //this.recvBufferPosition should be zero ideally for a new block.

                    if (this.recvBufferPosition != 0){
                        //Somethings fucked up.
                        console.log(`FUCK #1`);
                        return;
                    }

                    //Lets copy the data we got into our buffer.
                    data.subarray(13).copy(this.recvBuffer, this.recvBufferPosition); //Copy the piece data part of the message into our buffer/
                    this.recvBufferPosition += blockDataLen;
                    //We should check if we actually somehow received the whole piece in this message itself.
                    if (blockDataLen == this.recvBlock.size){
                        //Completed the block.
                        console.log(`[RECEIVED] Piece #${this.thePiece.number} Block #${this.recvBlockIndex}`);
                        //Flush the data to our piece buffer.
                        this.recvBuffer.copy(this.thePiece.data, this.recvBlock.start);
                        this.thePiece.blocks[this.recvBlockIndex].have = true;
                        //Request the next block.
                        this.recvBlockIndex++;
                        this.requestBlock();
                        return;
                    }

                    //Otherwise we expect more data as it is.
                    
                }

            }
        } else {
            //All the data is part of our block.

            data.copy(this.recvBuffer, this.recvBufferPosition);
            this.recvBufferPosition += data.length;

            if (this.recvBufferPosition == this.recvBlock.size){
                //I have got the whole block.
                console.log(`[RECEIVED] Piece #${this.thePiece.number} Block #${this.recvBlockIndex}`);
                this.recvBuffer.copy(this.thePiece.data, this.recvBlock.start);
                this.thePiece.blocks[this.recvBlockIndex].have = true;
                this.recvBlockIndex++;
                this.requestBlock();
            }
        }

    }
};