# Hero visual upgrade
- [x] Add editable match statistics and streamed personalized AI tactical advice; real generation verified in a paused match, eight tests passed, desktop/mobile panel checked. No match history stored.
- [x] Add combat damage numbers, attack trails, luminous impact particles and selective bloom; verified in real warrior/archer bot matches, critical damage test passed.
- [x] Add original hand-painted mossy stone and grass textures, corridor torches and translucent rippling river water; unchanged gameplay paths, rendering and animation checked at desktop and compact sizes. River reflection is a lightweight Fresnel/light approximation, not a live scene reflection; device performance remains unverified.
- [x] Source and validate CC0 animated GLBs for all four heroes (support uses a customized mage rig).
- [x] Replace hero primitives with cloned skeletal models, toon shading, and animated outlines.
- [x] Connect locomotion, attacks, spells, and death to existing simulation state without changing gameplay.
- [x] Verify actual matches and all hero rendering at desktop and mobile sizes; movement and shield casting checked, console clean and routing test passed.

# Combat readability (Heroes Evolved reference, phase 1)
- [x] Volumetric crescent slash arcs on melee attacks, sweeping with attack age; verified frozen at impact in a real bot match.
- [x] Ability range ring + cursor area marker while targeting, and pulsing target-lock ring under the attack target; verified in a real match.
- [x] Top-center target frame with name, level and HP bar for the focused enemy; verified in a real match.
- [x] Camera pitch lowered from 55° to 48° for stronger hero silhouettes.
- [ ] Phase 2: mobile dual-stick controls with fan ability buttons.
- [ ] Phase 3: HUD restyle (circular ability frames, radial cooldown sweep, segmented HP bars with level badge).

# Hero lighting refinement
- [x] Add class-colored rim lighting while preserving animated models, textures, and ink outlines.
- [x] Add a luminous runic selection ring that follows only the controlled hero.
- [x] Verify rendering and movement in a real match at desktop and mobile sizes; no shader, page, or asset request errors. Real-device frame rate remains unverified.