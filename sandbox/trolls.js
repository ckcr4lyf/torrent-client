const Socket = require('net').Socket;

let metadata = {
    infohash: "8A987AEA1545491112D1C70AC299304EF98CCC15"
};

const ip = "42.191.245.225";
const port = 55556;

let client = new Socket();

const handshake = Buffer.concat([Buffer.alloc(1, 19), Buffer.from("BitTorrent protocol"), Buffer.from("0000000000000000", 'hex'), Buffer.from(metadata.infohash, 'hex'), Buffer.from("2d4445313346302d5137774c456d516e56786a5a", 'hex')]);
const interested = Buffer.from("0000000102", 'hex');
let message = Buffer.alloc(17); //4 bytes size, 1 byte BT msg, 4bytes piece index, 4bytes offset, 4bytes length
message.writeInt32BE(13, 0); //We know its 13 bytes length
message.writeInt8(6, 4);
message.writeInt32BE(0, 5); //Piece number 0, 0x000000000 //Piecenumber 10, 0x00 00 00 0A
message.writeInt32BE(0, 9);
message.writeInt32BE(1024, 13);

client.connect(port, ip, () => {
    console.log(`TCP connected`);
    client.write(handshake);
});

client.on('data', (data) => {
    console.log("Received data", data);
    client.write(interested);
    // client.write(message);
})
