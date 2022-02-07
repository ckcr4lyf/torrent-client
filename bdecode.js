const bencode = require('bencode');
const fs = require('fs');

var data = fs.readFileSync('output2.dat.torrent');
var result = bencode.decode(data, 'utf8');


console.log(result);
var result = bencode.decode(data);
var r2 = bencode.encode(result.info);
console.log(r2.toString());