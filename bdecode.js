const bencode = require('bencode');
const fs = require('fs');
const crypto = require('crypto');

var data = fs.readFileSync('./.local/random22.bin.torrent');
var result = bencode.decode(data, 'utf8');


// console.log(result);
var result = bencode.decode(data);
var r2 = bencode.encode(result.info);

// console.log(r2.toString());

const hash = crypto.createHash('sha1').update(r2).digest('hex');
// console.log(hash);

// string
let pieces = result.info.pieces;

const pCount = (pieces.length) / 20;

console.log(`There are ${pCount} pieces`);

for (let i = 0; i < pCount; i++){
    const pHash = pieces.slice(i * 20, (i + 1) * 20).toString('hex');    
    console.log(`Hash for piece ${i} = ${pHash}`);
}


let metadata = {
    infohash: hash,
    pieceSize: result.info['piece length'],
    torrentSize: result.info.length,
    lastPieceSize: -1,
    pieceCount: pCount,
}

console.log(metadata);

// console.log(r2.toString());