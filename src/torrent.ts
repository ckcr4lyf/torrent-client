/**
 * Functions for helping with torrent file stuffs
 */

import bencode from '@ckcr4lyf/bencode-esm';
import * as crypto from 'crypto';

export type TorrentMetadata = {
    infohash: string;
    name: string;
    pieceSize: number;
    pieceCount: number;
    lastPieceSize: number;
    torrentSize: number;
}

export const parseTorrent = (torrentFile: Buffer): TorrentMetadata => {
    const parsed = bencode.decode(torrentFile);

    let torrentSize = parsed.info.length;

    if (torrentSize === undefined && Array.isArray(parsed.info.files)){
        torrentSize = 0;
        
        for (let x = 0; x < parsed.info.files.length; x++){
            torrentSize += parsed.info.files[x].length;
        }
    }

    // To calculate SHA1 hash, we need to calculate SHA1 of infodict
    const infoBencoded = bencode.encode(parsed.info);
    const infohash = crypto.createHash('sha1').update(infoBencoded).digest('hex');

    const pieceSize = parsed.info['piece length'];

    const pieceCount = Math.floor(torrentSize / pieceSize);
    
    let lastPieceSize = pieceSize;

    const leftover = torrentSize - (pieceCount * pieceSize);

    // If leftover is non-zero, its the last piece size.
    if (leftover !== 0){
        lastPieceSize = leftover;
    }
    
    return {
        infohash: infohash,
        name: parsed.info.name.toString(),
        pieceSize: pieceSize,
        pieceCount: pieceCount,
        lastPieceSize: lastPieceSize,
        torrentSize: torrentSize,
    }
}

