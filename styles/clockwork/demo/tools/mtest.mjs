import { buildMachine } from '../engine/machine.js';
const m = buildMachine();
const P = m.P;
console.log('LA', P.LA.toFixed(1), 'tRel1', P.tRel1.toFixed(3), 'tEnd1', P.tEnd1.toFixed(3), 'v1', P.v1.toFixed(0));
console.log('Pv', P.Pv.map(x => x.toFixed(1)), 'Lv', P.Lv.map(x => x.toFixed(1)), 'D', P.D.map(x => x.toFixed(1)), 'E', P.E.map(x => x.toFixed(1)), 'F', P.F.map(x => x.toFixed(1)));
console.log('Pp2', P.Pp2.map(x => x.toFixed(1)), 'helix', P.helix.xs.toFixed(1), P.helix.y0.toFixed(1), 'xDom0', P.xDom0.toFixed(1), 'yTrough', P.yTrough.toFixed(1), 'domY', P.domY.toFixed(1));
console.log('tTrain', m.tRel.toFixed(3), 'tLift', m.tLift.toFixed(3), 'tHit2', m.tHit2.toFixed(3), 'tLast', m.tLast.toFixed(3), 'tStrike', m.tStrike.toFixed(3), 'wD deg/s', (m.wD * 180 / Math.PI).toFixed(0));
console.log(m.links.map(l => `${l.id} ${l.name} ${l.t0.toFixed(2)}-${l.t1.toFixed(2)} (${(l.t1 - l.t0).toFixed(2)})`).join('\n'));
console.log('domT', P.domT.map(x => x.toFixed(2)).join(' '));
const m2 = buildMachine({ pair2: [30, 30] });
console.log('run2 tLift', m2.tLift.toFixed(3), 'tHit2', m2.tHit2.toFixed(3), 'tStrike', m2.tStrike.toFixed(3), 'ratio', m2.ratio);
console.log('ratchets', m.events.filter(e => e.type === 'ratchet').length, m2.events.filter(e => e.type === 'ratchet').length);
for (const t of [0, 1, 2.5, 3, 3.7, 4, 8, 12.4, 12.6, 14]) { const S = m.state(t); console.log(t, 'b1', S.b1.x.toFixed(1), S.b1.y.toFixed(1), 'beam', (S.beam * 57.3).toFixed(1), 'cam', (S.cam * 57.3 % 360).toFixed(0), 'rod', S.rod.toFixed(2), 'b2', S.b2.x.toFixed(1), S.b2.y.toFixed(1), S.b2.z.toFixed(1)); }
