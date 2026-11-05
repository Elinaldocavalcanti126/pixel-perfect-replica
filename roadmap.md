# Hero visual upgrade
- [ ] Add editable match statistics and streamed personalized AI tactical advice; verify input rules and a real generation.
- [x] Add combat damage numbers, attack trails, luminous impact particles and selective bloom; verified in real warrior/archer bot matches, critical damage test passed.
- [x] Add original hand-painted mossy stone and grass textures, corridor torches and translucent rippling river water; unchanged gameplay paths, rendering and animation checked at desktop and compact sizes. River reflection is a lightweight Fresnel/light approximation, not a live scene reflection; device performance remains unverified.
- [x] Source and validate CC0 animated GLBs for all four heroes (support uses a customized mage rig).
- [x] Replace hero primitives with cloned skeletal models, toon shading, and animated outlines.
- [x] Connect locomotion, attacks, spells, and death to existing simulation state without changing gameplay.
- [x] Verify actual matches and all hero rendering at desktop and mobile sizes; movement and shield casting checked, console clean and routing test passed.

# Hero lighting refinement
- [x] Add class-colored rim lighting while preserving animated models, textures, and ink outlines.
- [x] Add a luminous runic selection ring that follows only the controlled hero.
- [x] Verify rendering and movement in a real match at desktop and mobile sizes; no shader, page, or asset request errors. Real-device frame rate remains unverified.