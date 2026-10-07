// The fixed layout shared by every shot of a film: tags, timecode, picture-in-picture, content area, card slots and the subtitle band
// never move from shot to shot. 16:9 (1920x1080) and 9:16 (1080x1920, footage stacked above, annotations and subtitles below, clear of the
// platform UI in the bottom 330 px).
export function layoutFor(W, H) {
  const V = H > W;
  if (!V) {
    const M = 56;
    return {
      V, W, H, M, k: 1,
      tag: { x: M, y: 44, h: 64 }, prog: { xr: W - M, y: 44, h: 64 }, tc: { x: M, y: 122, h: 48 },
      stage: { x: 0, y: 0, w: W, h: H },                                   // footage fills the frame (contain); chrome sits on top
      pip: { x: W - M - 448, y: 128, w: 448, h: 252 },
      area: { x: M, y: 150, w: W - 2 * M, h: 650 },                        // explain / compare / hook content
      basis: { x: M, y: 812, w: W - 2 * M },
      lower: { x: M, y: 700, w: 820 },                                     // lower third: bottom edge at 860
      card: { l: { x: M, y: 596, w: 800, h: 264 }, r: { x: W - M - 800, y: 596, w: 800, h: 264 } },
      legend: null,
      sub: { x: W / 2, bottom: 1040, size: 54, lh: 70, maxW: W - 2 * M - 120, scrimTop: 860, scrimSolid: 930 },
      sizes: { tag: 34, label: 38, body: 40, head: 52, title: 68, big: 220, stamp: 30 },
    };
  }
  const M = 40;
  return {
    V, W, H, M, k: 1,
    tag: { x: M, y: 84, h: 64 }, prog: { xr: W - M, y: 84, h: 64 }, tc: { x: M, y: 160, h: 48 },
    stage: { x: 0, y: 230, w: W, h: 700 },                                  // footage sits in this band, annotations are below it
    pip: { x: W - M - 330, y: 242, w: 330, h: 186 },
    area: { x: M, y: 200, w: W - 2 * M, h: 1060 },
    basis: { x: M, y: 1280, w: W - 2 * M },
    lower: { x: M, y: 1060, w: W - 2 * M },
    card: { l: { x: M, y: 950, w: W - 2 * M, h: 360 }, r: { x: M, y: 950, w: W - 2 * M, h: 360 } },
    legend: { x: M, y: 950, w: W - 2 * M, h: 360 },
    sub: { x: W / 2, bottom: 1560, size: 50, lh: 66, maxW: W - 2 * M - 40, scrimTop: 1360, scrimSolid: 1430 },
    sizes: { tag: 32, label: 36, body: 38, head: 48, title: 70, big: 170, stamp: 30 },
  };
}
