//The main torrent client / handler

// "load" torrent metadata

import { torrentMetadata, piece, file_in_torrent } from './declarations';
import { getLastPieceSize, preparePieceMap, writePiece } from './functions';
import { peer } from './peer';
import { peerid } from './test_constants';

let metadata: torrentMetadata = {
    infohash: "27B3CE8F72881216C768110D17FE0BEB13AD76BB",
    pieceSize: 32 * 1024,
    torrentSize: 88 * 1024, //8415543 + 7469233,
    lastPieceSize: -1,
    pieceCount: 3 //61
};

metadata.lastPieceSize = getLastPieceSize(metadata);

console.log(metadata);

//Assume becode parser

let filemap: Array<file_in_torrent> = [
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

// let filemap: Array<file_in_torrent> = [
//     {
//         name: "4.png",
//         size: 7469233,
//         offset: 0
//     },
//     {
//         name: "5.png",
//         size: 8415543,
//         offset: 7469233
//     }
// ];

let pieceMap: {
    completed: Array<piece>,
    incomplete: Array<piece>,
    downloading: Array<piece>
} = {
    completed: [],
    incomplete: preparePieceMap(metadata),
    downloading: []
};

// console.log(pieceMap);

//For now we will hardcode a peer for testing. Later on announce and get peers.
let p1 = new peer("185.207.164.243", 62465, metadata, peerid);
// let p1 = new peer("127.0.0.1", 51000, metadata, peerid);

p1.connect();

p1.on('unchoked', () => {
    //Let's request a piece

    if (pieceMap.incomplete.length > 0){
        //Lets shift it from incomplete to downloading.
        let thePiece = pieceMap.incomplete[0];
        pieceMap.incomplete.splice(0, 1);
        pieceMap.downloading.push(thePiece);
        p1.downloadPiece(thePiece);
        console.log(`going to download piece #${thePiece.number} which has size ${thePiece.size}, and ${thePiece.blocks.length} blocks.`)
    }
})

p1.on('piece_complete', async (thePiece: piece) => {
    //Write the piece to disk

    console.log(`[COMPLETED] Piece #${thePiece.number}.`);
    await writePiece(thePiece.number, thePiece, filemap, metadata);

    //get the next piece from pieceMap.incomplete.
    //Tell p1 to download it

    //repeat till no more pieces left.
    if (pieceMap.incomplete.length > 0){
        let nextPiece = pieceMap.incomplete[0];
        pieceMap.incomplete.splice(0, 1);
        pieceMap.downloading.push(nextPiece);
        p1.downloadPiece(nextPiece);
    }
})