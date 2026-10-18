# Moonturn — design doc

**Pitch.** Tobi, a tiny sprout-sprite in a long orange scarf, wakes on a pocket-sized moon and has to relight the Heartstar. Every world is a cluster of toy planets you can run all the way round (walk-around gravity, like the great planet-hopping platformers). Each world adds one idea that bends space: you can hop between gravity fields, **twist** whole bands of a planet like a puzzle box so broken paths line up, and **look** at scattered shards from just the right spot until the impossible bridge you see turns real. Falling never punishes: time **rewinds** you to your last safe step (a Braid-style forgiving fail).

**Pillars.** Joyful movement first (coyote time, jump buffer, variable jump, squash & stretch). What you see is what you can walk. Every mechanic is taught wordlessly (a floor glyph plus a pulsing button), then twisted, then the world ends on a spectacle. Nothing is ever gated behind an ability you don't have; every twist cycles, so a wrong move is undone by twisting again.

## Worlds
| World | Mechanic | Teach → Twist → Spectacle |
|---|---|---|
| Hub: Lantern Meadow | walking | four portal blooms around a meadow moon, opened in order |
| 1 Dandelion Rise | walk-around gravity, planet hops | 1-1 run round a moon, small hops → 1-2 jump off one moon and the next one's gravity catches you (twice) → dandelion burst |
| 2 Clockwork Orchard | **Twist** rings | 2-1 one twist lines a bridge up, then ride a turning platform round the pole → 2-2 three rings, different offsets, a grumblebug → the orchard spins and blooms |
| 3 Mirage Shoals | **Sightline** bridges | 3-1 stand on the eye glyph, face the way it points: shards fly together → 3-2 ride a twist ring to the viewpoint, then a side-on view → lanterns rise from the shoals |
| 4 Heartstar | **Cube planet** (gravity wraps over edges) + everything | 4-1 walk over cube edges, rotate a walled garden → 4-2 finale combining all → the Heartstar relights and the meadow blooms across every face |

**Collectibles.** Star Notes (each one plays the next note of a melody), one hidden Moonmoth per world (Zelda-style secret: off the obvious path, always reachable), and a Star for every planet cleared.

**Forgiving systems.** Rewind on any fall/hazard (counted as "rewinds" in stats). A guide wisp and a one-line hint appear after ~35 s without progress (or from the pause menu).

## Tech
Single static PWA, Three.js r169 (WebGL2). Collision is signed-distance based: every walkable shape (island caps, curved arc paths, boxes, the rounded-box cube planet) has an exact SDF and matching mesh, so collision is what's rendered. Gravity points to the body centre (rounded-box gradient), so spheres and cubes share one code path. Camera is parallel-transported along the surface; the key light rides over the camera's shoulder so the far side of a planet is never dark. No shadow maps or post-processing: a blob shadow, inverted-hull outline on Tobi, vertex-painted surfaces and a gradient sky keep it bright and cheap on iPhone.

Controls: left-side floating stick, Jump, Twist (lights up near a swirl pad), camera ◀ ▶ buttons or drag on the right. Keyboard WASD/arrows, Space, F/Enter twist, Q/E camera, Esc pause.
