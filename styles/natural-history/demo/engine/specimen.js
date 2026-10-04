// specimen.js: turns a generated organism (parts + ink set) into cached layers and draws it at any stage
// of its making: graphite under-drawing, pen ink replayed stroke by stroke, the wash spreading from a
// touch point, then the pin. The static layers are cached; only the unfinished stage is replayed.
import { clamp, lerp, makeCanvas, bboxOf } from './util.js';
import { washSpecimen, revealWash } from './wash.js';
import { InkSet, pencilOf, drawStroke } from './ink.js';

export function makeSpecimen(def, S = 2) {
  const wash = washSpecimen(def.parts, S);
  const pencilList = (def.construct || []).concat(pencilOf(def.ink.items.filter(s => s.kind === 'line'), def.seed || 3));
  const pencil = new InkSet().addAll(pencilList);
  // ink bounds
  let x0 = wash.x0, y0 = wash.y0, x1 = wash.x0 + wash.w, y1 = wash.y0 + wash.h;
  for (const s of def.ink.items.concat(def.construct || [])) { if (s.kind === 'dot') { x0 = Math.min(x0, s.x - 2); x1 = Math.max(x1, s.x + 2); y0 = Math.min(y0, s.y - 2); y1 = Math.max(y1, s.y + 2); } else for (const p of s.pts) { x0 = Math.min(x0, p.x - 3); x1 = Math.max(x1, p.x + 3); y0 = Math.min(y0, p.y - 3); y1 = Math.max(y1, p.y + 3); } }
  const ib = { x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1) };
  const inkCv = makeCanvas((ib.x1 - ib.x0) * S, (ib.y1 - ib.y0) * S), ic = inkCv.getContext('2d');
  ic.setTransform(S, 0, 0, S, -ib.x0 * S, -ib.y0 * S); def.ink.draw(ic, 1);
  const pencilCv = makeCanvas((ib.x1 - ib.x0) * S, (ib.y1 - ib.y0) * S), pc = pencilCv.getContext('2d');
  pc.setTransform(S, 0, 0, S, -ib.x0 * S, -ib.y0 * S); pencil.draw(pc, 1);
  return { ...def, S, wash, ib, inkCv, pencilCv, pencil };
}

// st: { pencil: 0..1 drawn, pencilA: alpha, ink: 0..1, wash: 0..1, washAt:{x,y,R}, a: alpha, dx, dy }
// ctx is expected to carry the camera transform. Everything is composited with multiply.
export function drawSpecimen(ctx, sp, st) {
  const { S, wash, ib } = sp, a = st.a ?? 1;
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.translate(st.dx || 0, st.dy || 0);
  const pa = st.pencilA ?? 1;
  if (st.pencil > 0 && pa > 0) {
    ctx.globalAlpha = pa * a;
    if (st.pencil >= 1) ctx.drawImage(sp.pencilCv, ib.x0, ib.y0, (ib.x1 - ib.x0), (ib.y1 - ib.y0));
    else sp.pencil.draw(ctx, st.pencil);
  }
  ctx.globalAlpha = a;
  const wp = st.wash ?? 0;
  if (wp > 0) {
    const w = wp >= 1 ? wash.canvas : revealWash(wash, wp, st.washAt.x, st.washAt.y, st.washAt.R, sp.seed || 1);
    ctx.drawImage(w, wash.x0, wash.y0, wash.w, wash.h);
  }
  const ip = st.ink ?? 0;
  if (ip > 0) {
    if (ip >= 1) ctx.drawImage(sp.inkCv, ib.x0, ib.y0, (ib.x1 - ib.x0), (ib.y1 - ib.y0));
    else sp.ink.draw(ctx, ip);
  }
  ctx.restore();
}
