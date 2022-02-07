import { block, file_in_torrent, piece, torrentMetadata } from './declarations';
import { promises as fs } from 'fs';
import { MAX_BLOCK_SIZE } from './constants';

export async function writePiece (pieceIndex: number, piece: piece, fileMap: Array<file_in_torrent>, metadata: torrentMetadata) {
    let pieceSize = piece.size ; //Size of THIS piece
    let mainOffset = pieceIndex * metadata.pieceSize; //which byte of the torrent
    let fileIndex = -1;
    let fileObject: file_in_torrent = null;
    let bytesWritten = 0;

    while (bytesWritten < pieceSize){
        //We still have bytes to write
        let writeOffset = mainOffset + bytesWritten; //New point in whole torrent where we need to write data to

        //Find the file which corresponds to this writeOffset
        for (let i = 0; i < fileMap.length; i++){
            fileObject = fileMap[i];

            if (fileObject.offset <=  writeOffset && (fileObject.offset + fileObject.size) > writeOffset){
                fileIndex = i;
                break;
            }
        }

        if (fileIndex == -1){
            //Wtf
            break;
        }

        //Calculate bytes to skip into the file (if piece starts in the middle of a file)
        let fileSeek = writeOffset - fileObject.offset;

        //Calculate how many bytes to write - usefull if the file end before the buffer's length
        let bytesToWrite = fileObject.size - fileSeek; //We can write max this much
        if (bytesToWrite > pieceSize - bytesWritten){
            //We dont have that many bytes. Write as much as we can
            bytesToWrite = pieceSize - bytesWritten;
        }

        //Write to the file
        console.log(`[I/O] Wrtiting Piece #${pieceIndex} to file ${fileObject.name}`);
        let fileHandle = await fs.open(fileObject.name, 'a+');
        await fileHandle.write(piece.data, bytesWritten, bytesToWrite, fileSeek);
        await fileHandle.close();
        console.log(`[I/O] Finished Wrtiting Piece #${pieceIndex} to file ${fileObject.name}!`);
        bytesWritten += bytesToWrite;
        piece.written = true;
        // pieces[pieceIndex].data = null; //Free the memory?
    }
}

export function blockRequestMessage (pieceIndex: number, pieceOffset: number, dataSize: number): Buffer {

    let message = Buffer.alloc(17); //4 bytes size, 1 byte BT msg, 4bytes piece index, 4bytes offset, 4bytes length
    message.writeInt32BE(13, 0); //We know its 13 bytes length
    message.writeInt8(6, 4);
    message.writeInt32BE(pieceIndex, 5); //Piece number 0, 0x000000000 //Piecenumber 10, 0x00 00 00 0A
    message.writeInt32BE(pieceOffset, 9);
    message.writeInt32BE(dataSize, 13);

    return message;
}

export function handshakeMessage (infoHash: string, peerId: string): Buffer {
    const protoLen = Buffer.alloc(1, 19);
    const protocolName = Buffer.from("BitTorrent protocol");
    const reserved = Buffer.from("0000000000000000", 'hex');

    const message = Buffer.concat([protoLen, protocolName, reserved, Buffer.from(infoHash, 'hex'), Buffer.from(peerId, 'hex')]);
    return message;
}

export function interestedMessage (): Buffer {
    return Buffer.from("0000000102", 'hex');
}

export function getLastPieceSize (metadata: torrentMetadata): number {
    return (metadata.torrentSize - ((metadata.pieceCount - 1) * metadata.pieceSize));
} 

export function preparePieceMap (metadata: torrentMetadata): Array <piece> {

    let pieces: Array<piece> = [];
    let x = 0;

    for (x = 0; x < metadata.pieceCount - 1; x++){
        let piece: piece = {
            number: x,
            hash: "",
            have: false,
            size: metadata.pieceSize,
            blocks: [],
            written: false,
            data: Buffer.alloc(0)
        };

        for (let y = 0; y < piece.size / MAX_BLOCK_SIZE; y++){
            let block: block = {
                start: y * MAX_BLOCK_SIZE,
                have: false,
                size: MAX_BLOCK_SIZE
            }

            piece.blocks.push(block);
        }

        pieces.push(piece);
    }

    //Last piece is still remaining.
    let piece: piece = {
        number: x,
        hash: "",
        have: false,
        size: metadata.lastPieceSize,
        blocks: [],
        written: false,
        data: Buffer.alloc(0)
    };

    x = 0; //We dont need x for the piece number anymore.
    for (x = 0; x < Math.ceil(piece.size / MAX_BLOCK_SIZE) - 1; x++){
        let block: block = {
            start: x * MAX_BLOCK_SIZE,
            have: false,
            size: MAX_BLOCK_SIZE
        }

        piece.blocks.push(block);
    }

    let lastBlock: block = {
        start: x * MAX_BLOCK_SIZE,
        have: false,
        size: metadata.lastPieceSize - (x * MAX_BLOCK_SIZE)
    };

    piece.blocks.push(lastBlock);
    pieces.push(piece);

    return pieces;
}

// export function pickPiece (pieces: Array<piece>): piece {
//     //Go over incomplete pieces and return the first?


// }