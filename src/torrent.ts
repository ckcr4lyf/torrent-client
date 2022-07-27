/**
 * Functions for helping with torrent file stuffs
 */

import * as bencode from 'bencode';
import * as crypto from 'crypto';

export const parseTorrent = (torrentFile: Buffer) => {

    console.log(bencode.default.decode);

    const parsed = bencode.decode(torrentFile, 'utf8');

    // To calculate SHA1 hash, we need to calculate SHA1 of infodict
    const infoBencoded = bencode.encode(parsed.info);
    const infohash = crypto.createHash('sha1').update(infoBencoded).digest('hex');
    console.log(parsed.info.pieces);

    

}