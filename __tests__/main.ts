import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import test from 'ava';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { parseTorrent } from '../src/torrent.js'

const fn = () => 'foo';

test('fn() returns foo', t => {
    const archTorrent = fs.readFileSync(path.join(__dirname, './fixtures/archlinux-2022.07.01-x86_64.iso.torrent'));
	t.is(fn(), 'foo');
    parseTorrent(archTorrent);
});