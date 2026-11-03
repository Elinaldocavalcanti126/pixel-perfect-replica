# Hero visual upgrade
- [ ] Add combat damage numbers, attack trails, luminous impact particles and selective bloom; verify in a bot match.
- [x] Source and validate CC0 animated GLBs for all four heroes (support uses a customized mage rig).
- [x] Replace hero primitives with cloned skeletal models, toon shading, and animated outlines.
- [x] Connect locomotion, attacks, spells, and death to existing simulation state without changing gameplay.
- [x] Verify actual matches and all hero rendering at desktop and mobile sizes; movement and shield casting checked, console clean and routing test passed.

# Hero lighting refinement
- [x] Add class-colored rim lighting while preserving animated models, textures, and ink outlines.
- [x] Add a luminous runic selection ring that follows only the controlled hero.
- [x] Verify rendering and movement in a real match at desktop and mobile sizes; no shader, page, or asset request errors. Real-device frame rate remains unverified.