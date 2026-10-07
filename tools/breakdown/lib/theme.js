// One palette object drives every colour of a breakdown film. Pass a name ('dark' | 'light') or an object that overrides keys:
//   "theme": "light"            or            "theme": { "base": "dark", "accent": "#7CE0FF", "accentInk": "#04121A" }
// Roles: ground/ground2 (page), panel/panel2/line (cards), ink/muted (text), accent (what the PRODUCT does / the numbered focus),
// warn (our own interpretation: the stamp and the dashed frame on explain/compare shots), plate (tag plates over footage).
export const THEMES = {
  dark: {
    ground: '#08110D', ground2: '#102019', panel: '#13241B', panel2: '#1B3226', line: '#2F4F3E', ink: '#EEF6EF', muted: '#A3BCAB',
    accent: '#B8F03C', accentInk: '#0A1409', warn: '#F6C453', warnInk: '#1B1405', plate: 'rgba(6,12,9,0.90)', plateInk: '#EEF6EF', scrim: '4,9,6',
  },
  light: {
    ground: '#F3F5EC', ground2: '#E5EBD9', panel: '#FFFFFF', panel2: '#ECF1E2', line: '#B9C7AA', ink: '#12231A', muted: '#53675A',
    accent: '#3A8A06', accentInk: '#FFFFFF', warn: '#B36A00', warnInk: '#FFFFFF', plate: 'rgba(255,255,255,0.93)', plateInk: '#12231A', scrim: '4,9,6',
  },
};
export const FONT = '"Noto Sans SC", "PingFang SC", "Heiti SC", "Microsoft YaHei", sans-serif';
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return (.299 * r + .587 * g + .114 * b) / 255; };
export function resolveTheme(x) {
  const o = typeof x === 'string' ? { base: x } : (x || {});
  const t = { ...(THEMES[o.base || 'dark'] || THEMES.dark), ...o, font: o.font || FONT }; t.dark = lum(t.ground) < .5; return t;
}
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
