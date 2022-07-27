//The main torrent client / handler

// "load" torrent metadata

import { torrentMetadata, piece, file_in_torrent } from './declarations';
import { getLastPieceSize, preparePieceMap, writePiece } from './functions';
import { Peer, peer } from './peer';
import { peerid } from './test_constants';
import * as fs from 'fs/promises';
import * as path from 'path';

// let metadata: torrentMetadata = {
//     infohash: "27B3CE8F72881216C768110D17FE0BEB13AD76BB",
//     pieceSize: 32 * 1024,
//     torrentSize: 88 * 1024, //8415543 + 7469233,
//     lastPieceSize: -1,
//     pieceCount: 3 //61
// };

// let metadata: torrentMetadata = {
//     infohash: '0c1159fb9bd9a0b12515d78e7fc3ce466aea5a53',
//     pieceSize: 32768,
//     torrentSize: 100000,
//     lastPieceSize: -1,
//     pieceCount: 4
// }

let metadata: torrentMetadata = {
    infohash: '946257fe9daaee2f0624b1307ce737d20a951e3b',
    pieceSize: 131072,
    torrentSize: 104857600,
    lastPieceSize: -1,
    pieceCount: 800
  }

metadata.lastPieceSize = getLastPieceSize(metadata);

console.log(metadata);

//Assume becode parser

let filemap: Array<file_in_torrent> = [
    {
        name: "100MB.bin",
        size: 104857600,
        offset: 0
    },
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

// console.log(pieceMap.incomplete[0]);
// throw "XD";

(async () => {
    // Prepare files
    for (let file of filemap) {

        const filePath = path.join(__dirname, '../.local', file.name);
        await (await fs.open(filePath, 'w')).close();
        // await fs.truncate(filePath, file.size);

    }


    //For now we will hardcode a peer for testing. Later on announce and get peers.
    let p1 = new peer("46.232.211.243", 62086, metadata, peerid);
    // let p1 = new peer("127.0.0.1", 51000, metadata, peerid);

    p1.connect();

    p1.on('unchoked', () => {
        //Let's request a piece

        if (pieceMap.incomplete.length > 0) {
            //Lets shift it from incomplete to downloading.
            let thePiece = pieceMap.incomplete[0];
            pieceMap.incomplete.splice(0, 1);
            pieceMap.downloading.push(thePiece);
            console.log(`going to download piece #${thePiece.number} which has size ${thePiece.size}, and ${thePiece.blocks.length} blocks.`)
            p1.downloadPiece(thePiece);
        }
    })

    p1.on('piece_complete', async (thePiece: piece) => {
        //Write the piece to disk

        console.log(`\n[COMPLETED] Piece #${thePiece.number}.`);
        await writePiece(thePiece.number, thePiece, filemap, metadata);

        //get the next piece from pieceMap.incomplete.
        //Tell p1 to download it

        // repeat till no more pieces left.
        if (pieceMap.incomplete.length > 0){
            let nextPiece = pieceMap.incomplete[0];
            pieceMap.incomplete.splice(0, 1);
            pieceMap.downloading.push(nextPiece);
            console.log(`going to download piece #${nextPiece.number} which has size ${nextPiece.size}, and ${nextPiece.blocks.length} blocks.`)
            p1.downloadPiece(nextPiece);
        }
    })
})();


// Actual class stuff here...

class TorrentClient {


    public peers: Peer[];

    constructor(){
        this.peers = [];
    }

    /**
     * newTorrent will start the download of a new torrent.
     * 
     * @param torrentFile The actual torrent file
     */
    newTorrent(torrentFile: Buffer){
        // TODO: Parse the torrent file
    }


}

