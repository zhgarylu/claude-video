import { meshCheck } from '../engine/gears.js';
for (const [a, b] of [[12, 48], [30, 30], [12, 48], [8, 40], [16, 20]]) console.log(a, b, meshCheck(a, b, 0.5));
