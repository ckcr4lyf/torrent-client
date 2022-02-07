const net = require('net');
const fs = require('fs').promises;

const protoLen = 19;
const protocolName = "BitTorrent protocol";
const reserved = "0000000000000000";
const infohash = "9507515dbcc2934942a65366be5596e10f980fde";// <- this is the 3 files 20, 24 and 20k //<- this is exact 64k file AND this is the nfo file -> "a49d6288b17408b0cbef1e94bf271a0cfaf32cbd";
const peerid = "2d4445313346302d5137774c456d516e56786a5a"; //Deluge 1.3.15

const handshakeHex = Buffer.concat([Buffer.from(protoLen.toString(16), 'hex'), Buffer.from(protocolName), Buffer.from(reserved, 'hex'), Buffer.from(infohash, 'hex'), Buffer.from(peerid, 'hex')]);
const interested = Buffer.from("0000000102", 'hex');

let client = new net.Socket();

let remoteIP = "127.0.0.1";
let remotePort = 51000;

let handshakeRecv = false;
let maxRequest = 16384;
let pieceSize = 32768;
let lastPieceSize = 32768; //Used when building initial piece table
let piece_count = 2;

let recvTemp = false;
let recvBuf = Buffer.alloc(maxRequest, 0);
let recvBufPos = 0;

let asking = false;
let ask = null;

let writePiece = async (pieceIndex) => {
    let thisPieceSize = pieces[pieceIndex].size;
    let og_offset = (pieceIndex * pieceSize); //The starting byte position. Even for last piece, use piece size for offset calculation
    let fileIndex = -1;
    let fileObj = null;
    let bytesWritten = 0;

    while (bytesWritten < thisPieceSize){ //if the piece still has some bytes left over
        let offset = og_offset + bytesWritten;

        //Find the file which will take data from our piece.
        for (let i = 0; i < fileMap.length; i++){
            fileObj = fileMap[i];
    
            if (fileObj.offset <= offset && (fileObj.offset + fileObj.size) > offset){
                fileIndex = i;
                break;
            }
        }
    
        if (fileIndex == -1){
            //wtf
            return;
        }
    
        //calculte bytes to skip in the file (if any)
        let fileSeek = offset - fileObj.offset; //Seek this much in the file
    
        //calculate bytes to write - useful if the current file is smaller than the pieceSize.
        let bytesToWrite = fileObj.size - fileSeek;
        if (bytesToWrite > thisPieceSize - bytesWritten){
            bytesToWrite = thisPieceSize - bytesWritten; //This file has a lot of space, but we're limited by the pieceSize
        }
    
        //we know which file to write to. So lets fucking do it bois
        console.log(`[I/O] Wrtiting Piece #${pieceIndex} to file ${fileObj.name}`);
        let fileHandle = await fs.open(fileObj.name, 'a+');
        await fileHandle.write(pieces[pieceIndex].data, bytesWritten, bytesToWrite, fileSeek);
        await fileHandle.close();
        bytesWritten += bytesToWrite;
        console.log(`[I/O] Finished Wrtiting Piece #${pieceIndex} to file ${fileObj.name}!`);
        //TODO: Free the memory occupied by pieces[pieceIndex].data
    }
}

let fileMap = [
    /*{
        name: "output.dat",
        size: 65536,
        offset: 0
    }*/
    {
        name: "file1.bin",
        size: 20480,
        offset: 0
    },
    {
        name: "file2.bin",
        size: 24576,
        offset: 20480
    },
    {
        name: "file3.bin",
        size: 20480,
        offset: 20480 + 24576
    },
    {
        name: "file4.bin",
        size: 24576,
        offset: 20480 + 24576 + 20480
    }
];

let torrentSize = fileMap[fileMap.length - 1].offset + fileMap[fileMap.length - 1].size;
piece_count = Math.ceil(torrentSize / pieceSize);
lastPieceSize = torrentSize - ((piece_count - 1) * pieceSize);

let preparePieceMap = () => {
    let pieces = [];

    for (let x = 0; x < piece_count - 1; x++){
        let blocks = [];

        for (let y = 0; y < (pieceSize / maxRequest); y++){
            let block = {
                start: (y * maxRequest),
                have: false,
                size: maxRequest
            }

            blocks.push(block);
        }

        let piece = {
            hash: "xxx",
            have: false,
            size: pieceSize,
            blocks: blocks,
            written: false, //If the buffer has been written to the file on Hard disk.
            data: null //Allocate a buffer when we start the download, zero it out.
        }

        pieces.push(piece);
    }

    //Handle last piece separately.
    let lastPiece = {
        hash: "xxx",
        have: false,
        size: lastPieceSize,
        written: false,
        data: null
    };

    let lastBlocksCount = Math.ceil(lastPieceSize / maxRequest); //If 4, that means, 3 are 16KiB, 4th is lastPieceSize - (3 * maxReq)
    let lastBlocks = [];
    let x = 0;
    for (x = 0; x < lastBlocksCount - 1; x++){
        let block = {
            start: (x * maxRequest),
            have: false,
            size: maxRequest
        };

        lastBlocks.push(block);
    }
 
    let actualLastBlock = {
        start: (x * maxRequest),
        have: false,
        size: (lastPieceSize - (x * maxRequest))
    };

    lastBlocks.push(actualLastBlock);
    lastPiece.blocks = lastBlocks;
    pieces.push(lastPiece);

    return pieces;
}

let pieces = preparePieceMap();     

let requestPiece = (pieceIndex, pieceOffset, dataSize) => {
    let msg = Buffer.alloc(17);
    msg.writeInt32BE(13, 0);
    msg.writeInt8(6, 4); //Code for request piece
    msg.writeInt32BE(pieceIndex, 5);
    msg.writeInt32BE(pieceOffset, 9);
    msg.writeInt32BE(dataSize, 13);
    return msg;
}

client.on('data', (data) => {
    if (!handshakeRecv){
        console.log("[BT] Received handshake response!");
        // console.log(data.toString('hex'));
        handshakeRecv = true;
        //Lets tell him we are interested
        console.log(`[BT] Telling Peer we are interested...`);
        client.write(interested);
        
    } else if (recvTemp == true) {
        //Put the whole data into our buf
        if (data.length > maxRequest) {
            //Just in case
            return;
        }

        console.log(`[RECEIVED -2] Piece #${ask.piece} Offset #${ask.offset} RecvBufPos ${recvBufPos}. Bytes: ${data.length}`);
        data.copy(recvBuf, recvBufPos);
        recvBufPos += data.length;

        if (recvBufPos >= ask.size){
            //We have got all our data for this block.
            recvBuf.copy(pieces[ask.piece].data, ask.offset); //Put the block in correct offset of piece
            ask.offset += maxRequest;
            recvTemp = false; //We need normal parsing of data
            recvBufPos = 0;

            if (ask.offset < pieces[ask.piece].size){
                //Lets ask for the next offset.
                //Size for the next guy
                bIndex = ask.offset / maxRequest;
                ask.size = pieces[ask.piece].blocks[bIndex].size;
                let reqMsg = requestPiece(ask.piece, ask.offset, ask.size);
                asking = true;
                console.log(`\n[REQUESTNG -2] Piece #${ask.piece} Offset #${ask.offset} - ${ask.size} bytes. RecvBufPos ${recvBufPos}`);
                client.write(reqMsg);
            } else {
                //We completed this piece.
                console.log(`[COMPLETED -2] Piece #${ask.piece}`);
                writePiece(ask.piece);
                ask.piece += 1;
                ask.offset = 0;

                if (ask.piece < piece_count){
                    //Lets ask for the next piece.
                    pieces[ask.piece].data = Buffer.alloc(pieceSize, 0);
                    bIndex = ask.offset / maxRequest;
                    ask.size = pieces[ask.piece].blocks[bIndex].size;
                    let reqMsg = requestPiece(ask.piece, ask.offset, ask.size);
                    console.log(`\n[REQUESTNG -2] Piece #${ask.piece} Offset #${ask.offset} - ${ask.size} bytes. RecvBufPos ${recvBufPos}`);
                    asking = true;
                    client.write(reqMsg);
                } else {
                    //We completed all pieces.
                    console.log("Done all pieces");
                    // console.log()
                }
            }
        }
    } else {
        // console.log("Received something else of length", data.length);
        // console.log(data);

        if (data.length == 1){
            // console.log("Got bitfield");
        } else if (data.length > 4) {
            let size = data.subarray(0,4).readInt32BE(); //First 4 bytes to an int
            if (size == 1 && data[4] == 1){
                //Unchoked. Ask for piece.
                console.log("[BT] Unchoked by peer!");
                pieces[0].data = Buffer.alloc(pieceSize, 0); //Lets allocate the memory to this lad.
                let reqMsg = requestPiece(0, 0, maxRequest);
                console.log(`\n[REQUESTNG -1] Piece #0 Offset #0`);
                client.write(reqMsg);
                asking = true;
                ask = {
                    piece: 0,
                    offset: 0,
                    size: maxRequest
                };

            } else if (data[4] == 7 && asking == true){
                //We got a piece
                // console.log("ITS A PIECE");
                asking = false; //If this guy send us another piece, ignore, havent asked yet.

                //Lets check the block metadata
                let pieceIndex = data.subarray(5, 9).readInt32BE();
                let pieceOffset = data.subarray(9, 13).readInt32BE();
                console.log(`[RECEIVED -1] Metadata for Piece #${pieceIndex} Offset #${pieceOffset}`);
                if (pieceIndex == ask.piece && pieceOffset == ask.offset){
                    //Valid piece.
                    if (data.length > 13){
                        recvTemp = true;
                        let blockData = data.subarray(13); //Till the end
                        // console.log("In this packet, received", blockData.length, "bytes.");
                        blockData.copy(recvBuf, recvBufPos);
                        console.log(`[RECEIVED -1] Piece #${ask.piece} Offset #${ask.offset} RecvBufPos ${recvBufPos}. Bytes: ${blockData.length}`);
                        recvBufPos += blockData.length;
                    } else {
                        recvTemp = true;
                    }
                }              
            }
        }
    }
});

client.connect(remotePort, remoteIP, () => {
    console.log(`[TCP] Conneted to remote @ ${remoteIP}:${remotePort}`);
    client.write(handshakeHex);
    console.log("[BT] Sent Handshake...");
});