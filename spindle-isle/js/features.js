// v1.1 switches. Missing keys default to on, so the live game is the new isle.
// Turning every switch off restores the v1.0 picture and the v1.0 feel.

export const FEATURES = [
  { id: 'sky', label: 'Golden-hour sky', hint: 'Painted sky, soft clouds, distant islets and sun glow' },
  { id: 'water', label: 'Sparkling water', hint: 'Highlights, foam at the sluice, and ripples when Pip touches the water' },
  { id: 'foliage', label: 'Lush meadow', hint: 'Swaying grass, flowers, mushrooms and small plants' },
  { id: 'light', label: 'Warmer light', hint: 'Soft shadows, rim light and a gentle shaded feel. No red tint' },
  { id: 'pip', label: 'Pip polish', hint: 'Glossy rounded Pip, squash and stretch, little eyes and a sparkle trail' },
  { id: 'life', label: 'Ambient life', hint: 'Butterflies, fireflies by the flower, falling petals and birds' },
  { id: 'juice', label: 'Juicy feedback', hint: 'Seed bursts, gear and windmill sparkles, landing shake and a bigger bloom' },
  { id: 'feel', label: 'Smoother feel', hint: 'Silkier tilt and spin, a hint toward the next seed, and a checkpoint if Pip falls' },
  { id: 'results', label: 'Star rating', hint: 'Results with time, seeds, stars and a saved best time' },
];

export const OLDER = [
  { v: 'v1.0', href: '../spindle-isle-v1.0/', note: 'the first isle' },
];

export function defaultFeats() {
  const out = {};
  for (const f of FEATURES) out[f.id] = true;
  return out;
}
