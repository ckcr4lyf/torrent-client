import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import test from 'ava';
import { parseTorrent } from '../src/torrent.js'

const __dirname = dirname(fileURLToPath(import.meta.url));

test('torrent is parsed correctly', t => {

    const archTorrent = fs.readFileSync(path.join(__dirname, './fixtures/archlinux-2022.07.01-x86_64.iso.torrent'));
    const got = parseTorrent(archTorrent);

    const expected = {
        infohash: '96cf64b47d8208e44ea999c17298df0e9e2de576',
        name: 'archlinux-2022.07.01-x86_64.iso',
    }

	t.deepEqual(got, expected);
});