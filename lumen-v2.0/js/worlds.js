/* LUMEN worlds: each band of levels is a place with its own sky, light, palette and music. */
const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
// piece colours in TYPES order: I J L O S T Z
export const WORLDS = [
  {
    id: 'dawn', name: 'Dawn Tide', line: 'first light on a quiet sea',
    sky: ['#7fa8f0', '#ffc1a8', '#ffe0b8', '#9ee4f2'],
    p1: [0, 0, 0.25, 0], p2: [1, 0, 0.35, 0],          // aurora rain stars caustic | ocean plasma nebula -
    pieces: ['#86ecff', '#7d93ff', '#ffb072', '#ffe18c', '#86f2b8', '#d59cff', '#ff8299'],
    accent: '#ffd2a1', accent2: '#86d4e6',
    music: { root: 62, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 80, prog: [0, 5, 3, 4], pad: 'triangle', lead: 'sine', swing: 0 },
  },
  {
    id: 'aurora', name: 'Aurora Veil', line: 'the sky remembers every colour',
    sky: ['#5f86d8', '#7fd0d8', '#7affc8', '#c4a2ff'],
    p1: [1, 0, 1, 0], p2: [0, 0, 0.25, 0],
    pieces: ['#72f7ff', '#5f8dff', '#ffa65e', '#fff07d', '#5cffaa', '#c07dff', '#ff5f8d'],
    accent: '#3dffb2', accent2: '#a06bff',
    music: { root: 64, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 88, prog: [0, 6, 5, 3], pad: 'sawtooth', lead: 'triangle', swing: 0 },
  },
  {
    id: 'rain', name: 'Neon Rain', line: 'a city hums under the storm',
    sky: ['#8a74d8', '#d79ad8', '#ff8ccc', '#7ae4ff'],
    p1: [0, 1, 0, 0], p2: [0, 0, 0.2, 0],
    pieces: ['#2ef0ff', '#4f70ff', '#ff9e40', '#ffe24f', '#4dffa0', '#ff52da', '#ff3f70'],
    accent: '#ff3fa4', accent2: '#22d4ff',
    music: { root: 57, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 108, prog: [0, 5, 2, 6], pad: 'sawtooth', lead: 'square', swing: 0.08 },
  },
  {
    id: 'crystal', name: 'Crystal Hollow', line: 'light, folded through stone',
    sky: ['#9b8ae6', '#c6b4f2', '#d8c0ff', '#a6f0ff'],
    p1: [0, 0, 0.15, 1], p2: [0, 0, 0.3, 0],
    pieces: ['#95f4ff', '#8190ff', '#ffb894', '#ffe8a8', '#a0ffd2', '#dbaaff', '#ff92bb'],
    accent: '#b98cff', accent2: '#70e8ff',
    music: { root: 66, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 96, prog: [0, 3, 5, 4], pad: 'triangle', lead: 'sine', swing: 0 },
  },
  {
    id: 'deep', name: 'Deep Field', line: 'ten thousand galaxies, all yours',
    sky: ['#5a78d6', '#8aa6ee', '#9cb8ff', '#ffa6e2'],
    p1: [0, 0, 1, 0], p2: [0, 0, 1, 0],
    pieces: ['#a2deff', '#7080ff', '#ffc083', '#fff3b3', '#8dffd9', '#bb9eff', '#ff91a6'],
    accent: '#7f9dff', accent2: '#ff6fcf',
    music: { root: 60, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 72, prog: [0, 1, 0, 4], pad: 'sine', lead: 'sine', swing: 0 },
  },
  {
    id: 'solar', name: 'Solar Crown', line: 'fall upward into the sun',
    sky: ['#f0a868', '#ffd29a', '#ffd27a', '#ffb07a'],
    p1: [0, 0, 0.1, 0], p2: [0, 1, 0.25, 0],
    pieces: ['#a6f2ff', '#8a8fff', '#ffb44f', '#ffe86d', '#b0ff7d', '#ff7ad3', '#ff5050'],
    accent: '#ffc94d', accent2: '#ffa36b',
    music: { root: 58, scale: [0, 2, 4, 5, 7, 9, 10], bpm: 124, prog: [0, 6, 3, 0], pad: 'sawtooth', lead: 'triangle', swing: 0 },
  },
];
for (const w of WORLDS) { w.skyRGB = w.sky.map(hex); }

/** Which world a game is in. Level bands for level-based modes; line-based for Sprint (5 worlds in 40 lines) and Zen (endless cycle). */
export function worldIndexFor(mode, level, lines) {
  // v2.0: a new themed world every 20 lines (every 2 levels), cycling; Sprint moves every 8 lines.
  if (mode === 'sprint') return Math.min(4, Math.floor(lines / 8));
  if (mode === 'puzzle') return Math.floor((level - 1) / 5) % WORLDS.length; // level = puzzle number
  return Math.floor(lines / 20) % WORLDS.length;
}
export function hexToRgb(h) { return hex(h); }
