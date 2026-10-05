// One timeline for picture, type and sound. 96 BPM, bar = 2.5 s, beat = 0.625 s.
export const BPM = 96, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const DUR = 52.5;

// camera shots: from/to keys eased in-out over [t0,t1]. az/el in degrees (az 0 = camera on +z), lengths in cm.
// tgt = look-at point, dist = distance, fov degrees, shift = lens shift (fraction of frame width, + moves the subject right),
// aper = depth-of-field strength (0 = deep), fo = focus offset added to dist.
export const SHOTS = [
  { id: 'drop', t0: 0.0, t1: 5.0,
    a: { tgt: [0.5, 17.3, 4.1], az: 24, el: 3, dist: 14.0, fov: 18, shift: 0, aper: 1, fo: 0 },
    b: { tgt: [0.4, 16.5, 4.1], az: 10, el: 2, dist: 11.8, fov: 18, shift: 0, aper: 1, fo: 0 } },
  { id: 'hero', t0: 5.0, t1: 12.5,
    a: { tgt: [0, 15.5, 0], az: 16, el: 4, dist: 158, fov: 18, shift: 0.15, aper: 1, fo: 0 },
    b: { tgt: [0, 15.5, 0], az: -4, el: 7, dist: 142, fov: 18, shift: 0.15, aper: 1, fo: 0 } },
  { id: 'leather', t0: 12.5, t1: 20.0,
    a: { tgt: [0.6, 6.6, 4.2], az: 20, el: 7, dist: 36, fov: 18, shift: -0.2, aper: 1, fo: 0 },
    b: { tgt: [1.0, 10.6, 4.2], az: 36, el: 5, dist: 29, fov: 18, shift: -0.2, aper: 1, fo: 0 } },
  { id: 'cap', t0: 20.0, t1: 25.0,
    a: { tgt: [0, 29.0, 0], az: -58, el: 14, dist: 48, fov: 18, shift: -0.22, aper: 1, fo: 0 },
    b: { tgt: [0, 29.2, 0], az: -14, el: 24, dist: 40, fov: 18, shift: -0.22, aper: 1, fo: 0 } },
  { id: 'explode', t0: 25.0, t1: 35.0,
    a: { tgt: [0, 44, 0], az: -34, el: 10, dist: 335, fov: 18, shift: 0, aper: 0.6, fo: 0 },
    b: { tgt: [0, 44, 0], az: 26, el: 15, dist: 310, fov: 18, shift: 0, aper: 0.6, fo: 0 } },
  { id: 'day', t0: 35.0, t1: 42.5,
    a: { tgt: [0, 17.5, 0], az: -14, el: 3, dist: 84, fov: 18, shift: 0.17, aper: 1, fo: 0 },
    b: { tgt: [0, 17.0, 0], az: 12, el: 4, dist: 68, fov: 18, shift: 0.17, aper: 1, fo: 0 } },
  { id: 'end', t0: 42.5, t1: 52.5,
    a: { tgt: [0, 16.5, 0], az: 5, el: 3, dist: 162, fov: 18, shift: -0.2, aper: 1, fo: 0 },
    b: { tgt: [0, 16.2, 0], az: -3, el: 4, dist: 150, fov: 18, shift: -0.2, aper: 1, fo: 0 } },
];
export const CUTS = [5.0, 12.5, 20.0, 25.0, 35.0, 42.5];   // rack-focus transitions are centred on these

// the sweep strip in the studio rig: angle (deg) relative to the camera azimuth, [t, rel]. 0 = behind the camera (a highlight
// down the middle of a cylinder), +-170 = the strip is behind the object (rim). Keys are eased.
export const SWEEPS = [
  [0.0, -165], [0.2, -165], [3.9, 8], [5.0, 8],
  [5.3, -150], [8.2, 150], [12.5, 150],
  [12.9, -145], [17.4, 140], [20, 140],
  [20.3, -150], [23.9, 150], [25.2, 150],
  [26, 100], [35, 100],
  [35.3, -170], [41.8, 170], [42.5, 170],
  [43.0, -150], [47.8, 40], [52.5, 40],
];
// light-wipe reveal pass (screen space): progress 0..1 over [t0,t1]
export const REVEAL = [0.0, 1.7];

// exploded view: amount 0..1
export const EXPL = { out0: 26.25, out1: 29.9, back0: 33.35, back1: 33.75 };

// type and callouts. x,y in px (1920x1080). cls picks the style. world = callout anchor in the scene (cm) or a part id.
export const TYPE = [
  { id: 'k1', t0: 2.3, t1: 4.9, text: 'TIDE FLASK', cls: 'kick', lt: true, x: 1370, y: 960 },
  { id: 'tag1', t0: 6.1, t1: 12.2, text: 'Cold stays', cls: 'tag', x: 120, y: 360, anim: 'rise' },
  { id: 'tag2', t0: 6.35, t1: 12.2, text: 'cold.', cls: 'tag', x: 120, y: 500, anim: 'rise' },
  { id: 'sub1', t0: 7.6, t1: 12.2, text: 'The 0.75 L vacuum flask from Aldermoor.', cls: 'sub', x: 124, y: 660, anim: 'fade' },
  { id: 'n1', t0: 13.4, t1: 19.7, text: '01', cls: 'num', x: 1200, y: 330, anim: 'fade' },
  { id: 'h1', t0: 13.6, t1: 19.7, text: 'Vegetable-tanned leather', cls: 'head', x: 1200, y: 400, anim: 'rise' },
  { id: 'b1', t0: 14.1, t1: 19.7, text: 'Stitched by hand. It darkens to honey with use.', cls: 'body', x: 1202, y: 490, anim: 'fade' },
  { id: 'n2', t0: 20.7, t1: 24.7, text: '02', cls: 'num', x: 1200, y: 330, anim: 'fade' },
  { id: 'h2', t0: 20.9, t1: 24.7, text: 'Glazed ceramic cap', cls: 'head', x: 1200, y: 400, anim: 'rise' },
  { id: 'b2', t0: 21.4, t1: 24.7, text: 'Kiln-fired cobalt glaze.', cls: 'body', x: 1202, y: 490, anim: 'fade' },
  { id: 'n3', t0: 27.4, t1: 34.6, text: '03', cls: 'num', x: 120, y: 120, anim: 'fade' },
  { id: 'h3', t0: 27.6, t1: 34.6, text: 'Double-wall vacuum', cls: 'head', x: 120, y: 190, anim: 'rise' },
  { id: 'b3', t0: 28.1, t1: 34.6, text: 'Two steel walls and nothing between them.', cls: 'body', x: 122, y: 270, anim: 'fade' },
  { id: 'l1', t0: 29.0, t1: 33.4, text: 'Ceramic cap', cls: 'lab', part: 'cap', side: 'r', anim: 'fade' },
  { id: 'l2', t0: 29.2, t1: 33.4, text: 'Silicone seal', cls: 'lab', part: 'gasket', side: 'r', anim: 'fade' },
  { id: 'l3', t0: 29.4, t1: 33.4, text: 'Vacuum liner', cls: 'lab', part: 'liner', side: 'r', anim: 'fade' },
  { id: 'l4', t0: 29.6, t1: 33.4, text: 'Brushed steel body', cls: 'lab', part: 'body', side: 'r', anim: 'fade' },
  { id: 'l5', t0: 29.8, t1: 33.4, text: 'Leather sleeve', cls: 'lab', part: 'sleeve', side: 'r', anim: 'fade' },
  { id: 'l6', t0: 30.0, t1: 33.4, text: 'Silicone base', cls: 'lab', part: 'base', side: 'r', anim: 'fade' },
  { id: 'big', t0: 35.7, t1: 42.2, text: '24h', cls: 'big', x: 112, y: 150, anim: 'rise' },
  { id: 'dsub', t0: 36.3, t1: 42.2, text: 'Cold, for a full day.', cls: 'sub', x: 124, y: 640, anim: 'fade' },
  { id: 'e0', t0: 43.5, t1: 52.5, text: 'ALDERMOOR', cls: 'kick', x: 1180, y: 250, anim: 'fade' },
  { id: 'e1', t0: 43.8, t1: 52.5, text: 'Tide Flask', cls: 'tag', x: 1176, y: 290, anim: 'rise' },
  { id: 'e2', t0: 44.6, t1: 52.5, text: 'Cold stays cold.', cls: 'sub', x: 1182, y: 470, anim: 'fade' },
  { id: 'e3', t0: 46.6, t1: 52.5, text: '$48', cls: 'price', x: 1180, y: 590, anim: 'rise' },
  { id: 'e4', t0: 47.8, t1: 52.5, text: 'aldermoor.example/tide', cls: 'cta', x: 1180, y: 770, anim: 'fade' },
];
// day line (shot 6): ticks at 00 06 12 18 24
export const DAY = { t0: 35.8, t1: 41.8, x0: 120, x1: 900, y: 880 };

// sound events for the mixer. type: whoosh(dur), drop, slide(dur), rub(dur), twist(dur), clink, part, snap, tick, ui, chime, swell
const bar = n => n * BAR;
export const EV = [
  { t: 0.15, type: 'whoosh', dur: 2.2, v: 0.8 },
  { t: 1.5, type: 'drop', v: 0.6 },
  { t: 2.0, type: 'slide', dur: 1.2, v: 0.5 },
  { t: 3.25, type: 'slide', dur: 1.3, v: 0.7 },
  { t: 4.7, type: 'drop', v: 0.9 },
  { t: 4.75, type: 'cut', v: 1 }, { t: 12.25, type: 'cut', v: 1 }, { t: 19.75, type: 'cut', v: 1 },
  { t: 24.75, type: 'cut', v: 1 }, { t: 34.75, type: 'cut', v: 1 }, { t: 42.25, type: 'cut', v: 1 },
  { t: 5.5, type: 'whoosh', dur: 2.4, v: 0.5 },
  { t: 6.2, type: 'ui', v: 0.5 }, { t: 6.45, type: 'ui', v: 0.4 },
  { t: 13.0, type: 'whoosh', dur: 2.6, v: 0.5 },
  { t: 13.4, type: 'ui', v: 0.5 },
  { t: 14.0, type: 'rub', dur: 2.6, v: 0.6 },
  { t: 17.0, type: 'rub', dur: 2.2, v: 0.5 },
  { t: 20.5, type: 'whoosh', dur: 2.2, v: 0.5 },
  { t: 20.7, type: 'ui', v: 0.5 },
  { t: 21.6, type: 'clink', v: 0.7 },
  { t: 22.2, type: 'twist', dur: 1.6, v: 0.8 },
  { t: 24.0, type: 'clink', v: 0.9 },
  { t: 27.4, type: 'ui', v: 0.5 },
  { t: 26.25, type: 'part', v: 0.8 }, { t: 26.45, type: 'part', v: 0.75 }, { t: 26.7, type: 'part', v: 0.7 },
  { t: 26.95, type: 'part', v: 0.7 }, { t: 27.2, type: 'part', v: 0.65 },
  { t: 29.0, type: 'ui', v: 0.35 }, { t: 29.2, type: 'ui', v: 0.35 }, { t: 29.4, type: 'ui', v: 0.35 },
  { t: 29.6, type: 'ui', v: 0.35 }, { t: 29.8, type: 'ui', v: 0.35 }, { t: 30.0, type: 'ui', v: 0.35 },
  { t: 33.75, type: 'snap', v: 1 },
  { t: 35.4, type: 'whoosh', dur: 6.2, v: 0.55 },
  { t: 35.8, type: 'ui', v: 0.5 },
  { t: 36.8, type: 'tick', v: 0.6 }, { t: 38.3, type: 'tick', v: 0.6 }, { t: 39.8, type: 'tick', v: 0.6 }, { t: 41.3, type: 'tick', v: 0.7 },
  { t: 43.0, type: 'whoosh', dur: 3.5, v: 0.4 },
  { t: 46.6, type: 'chime', v: 1 },
  { t: 47.9, type: 'ui', v: 0.4 },
];
