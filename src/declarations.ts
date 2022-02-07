export interface block {
    start: number, //How many bytes into the piece (multiple of 16384)
    have: boolean, //Have we downloaded it
    size: number //How big the block, usually 16384 bytes
};

export interface piece {
    number: number,
    hash: string,
    have: boolean,
    size: number,
    blocks: Array<block>,
    written: boolean,
    data: Buffer
};

export interface file_in_torrent {
    name: string,
    size: number,
    offset: number
};

export interface torrentMetadata {
    infohash: string,
    pieceSize: number,
    torrentSize: number,
    lastPieceSize: number,
    pieceCount: number
}