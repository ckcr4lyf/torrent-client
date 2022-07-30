/**
 * Functions for helping with torrent file stuffs
 */

import bencode from '@ckcr4lyf/bencode-esm';
import * as crypto from 'crypto';

export type TorrentMetadata = {
    infohash: string;
    name: string;
}

export const parseTorrent = (torrentFile: Buffer): TorrentMetadata => {
    const parsed = bencode.decode(torrentFile);


    // To calculate SHA1 hash, we need to calculate SHA1 of infodict
    const infoBencoded = bencode.encode(parsed.info);
    const infohash = crypto.createHash('sha1').update(infoBencoded).digest('hex');
    
    return {
        infohash: infohash,
        name: parsed.info.name.toString(),
    }
}