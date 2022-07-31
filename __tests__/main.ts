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
        pieceCount: 1590,
        lastPieceSize: 339968,
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
        pieceCount: 855,
        lastPieceSize: 37430,
        torrentSize: 56070710,
    }

    t.deepEqual(got, expected);
});

test('torrent is parsed correctly - exact piece count', t => {
    const wiredTorrent = fs.readFileSync(path.join(__dirname, './fixtures/32k_file.bin.torrent'));
    const got = parseTorrent(wiredTorrent);

    const expected = {
        infohash: '0eef18facb7933f7aecfd2f97f0b64574c25ab3d',
        name: '32k_file.bin',
        pieceSize: 16384,
        pieceCount: 2,
        lastPieceSize: 16384,
        torrentSize: 32768
      }

    t.deepEqual(got, expected);
});