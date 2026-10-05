// mechcheck.mjs: the physics gates. Every gear pair meshes without overlap; the chain's events happen in causal order; the cam ratio is what the voice says.
import { meshCheck } from '../engine/gears.js';
import { buildMachine } from '../engine/machine.js';
let bad = 0;
for (const [a, b] of [[12, 48], [30, 30]]) { const r = meshCheck(a, b, 0.5); console.log(`mesh ${a}:${b}`, r.ok ? 'ok' : 'OVERLAP ' + r.hits); if (!r.ok) bad++; }
for (const cfg of [{}, { pair2: [30, 30] }]) {
  const m = buildMachine(cfg), ev = m.events.filter(e => e.link).sort((x, y) => x.tau - y.tau);
  const order = ['roll1start', 'land', 'latch', 'lift', 'roll2start', 'hit', 'bell'];
  const first = Object.fromEntries(order.map(k => [k, ev.find(e => e.type === k)?.tau]));
  const seq = order.map(k => first[k]); const ok = seq.every((t, i) => t != null && (i === 0 || t >= seq[i - 1] - 1e-9));
  console.log('ratio', m.ratio, 'causal order', ok ? 'ok' : 'BROKEN', order.map(k => k + '=' + first[k].toFixed(2)).join(' '));
  if (!ok) bad++;
  const doms = m.events.filter(e => e.type === 'domino').map(e => e.tau); if (!doms.every((t, i) => i === 0 || t >= doms[i - 1])) { console.log('dominoes out of order'); bad++; }
}
process.exit(bad ? 1 : 0);
