import { torrentMetadata } from './declarations';
import { Peer } from './peer';

export let metadata: torrentMetadata = {
    infohash: "9507515dbcc2934942a65366be5596e10f980fde",
    pieceSize: 256 * 1024,
    torrentSize: 8415543 + 7469233,
    lastPieceSize: -1,
    pieceCount: 61
};

export const peerid: string = "2d4445313346302d5137774c456d516e56786a5a";

export const mypeer: Peer = new Peer("127.0.0.1", 51000, metadata, peerid);

