import test from 'ava';

import { parseTorrent } from '../src/torrent.js'

const fn = () => 'foo';

test('fn() returns foo', t => {
	t.is(fn(), 'foo');
    parseTorrent(Buffer.from("XD"));
});