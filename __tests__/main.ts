import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import test from 'ava';
import { parseTorrent } from '../src/torrent.js'

const __dirname = dirname(fileURLToPath(import.meta.url));

test('torrent is parsed correctly - single file', t => {

    const archTorrent = fs.readFileSync(path.join(__dirname, './fixtures/archlinux-2022.07.01-x86_64.iso.torrent'));
    const got = parseTorrent(archTorrent);

    const expected = {
        infohash: '96cf64b47d8208e44ea999c17298df0e9e2de576',
        name: 'archlinux-2022.07.01-x86_64.iso',
        pieceSize: 524288,
        torrentSize: 833957888,
    }

    t.deepEqual(got, expected);
});

test('torrent is parsed correctly - multiple files', t => {

    const wiredTorrent = fs.readFileSync(path.join(__dirname, './fixtures/wired-cd.torrent'));
    const got = parseTorrent(wiredTorrent);

    const expected = {
        infohash: 'a88fda5954e89178c372716a6a78b8180ed4dad3',
        name: 'The WIRED CD - Rip. Sample. Mash. Share',
        pieceSize: 65536,
        torrentSize: 56070710,
    }

    t.deepEqual(got, expected);
});