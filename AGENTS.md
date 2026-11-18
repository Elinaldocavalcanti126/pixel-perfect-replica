<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Mobile combat uses match-owned ref input sampled by the scene controller and wall-aware player commands; original ability atlas art and cooldown overlays stay in the HUD — keeps touch aiming independent of mouse rays and leaves combat balance unchanged.
- Tactical advice streams through a same-origin AI server route with bounded validated match input and server-only Responses helpers; durable provider-denial state prevents replay after reload without storing player statistics.
- Terrain composites local generated stone/grass albedo tiles against the unchanged walkable mask; a visual-only river uses animated Fresnel highlights with raised ford stones on existing routes, and corridor torches are instanced — enriches the map without modifying movement or adding reflection render passes.
- Combat feedback uses bounded informational World damage events and fixed-size Three.js VFX pools; post-processing blooms only HDR effect cores, with non-finite scrubbing before bloom and tone mapping afterward — preserves combat balance and toon readability.
- Dev-only `window.__game` exposes the live `world`, `sim(seconds)`, `move(x,z)` and `ability(index,x,z)`; canvas `data-scene-ready`, `data-damage-numbers`, `data-vfx-particles` and `data-vfx-trails` expose render readiness and pool counts — supports repeatable actual-match verification without duplicate simulation modules.
- Game state lives outside React in `src/game` (lightweight ECS World + systems, fixed 30 Hz tick); React only renders the 3D view and HUD — keeps simulation deterministic and ready for networked multiplayer.
- Player actions go through command functions in `src/game/game.ts` — they are the seam for future network input sync.
- Pathfinding is grid A* over the walkable map with line-of-sight smoothing — avoids a navmesh asset pipeline.
- Hero presentation uses per-instance SkeletonUtils clones of locally bundled CC0 GLBs, with useAnimations driven by existing movement, attack timestamps, and cooldown changes — keeps visual animation independent of simulation rules.
- Imported hero materials use stepped toon lighting and skeleton-bound outlines; retain source textures and dispose only instance-owned materials — preserves character identity without corrupting shared GLTF caches.
- Hero rim lighting and the controlled hero's ground decal resolve colors from global CSS tokens; lighting is added after skinned normals and decals follow the visual root without changing simulation — keeps theming and skeletal movement consistent.
- Aim feedback is visual-only: TargetingRings reads world state per frame (range ring while `input.targeting >= 0`, pulsing lock ring under `attackTarget`), melee slash arcs are instanced crescent meshes swept by attack age in CombatVfx, and the HUD target frame reads `player.attackTarget` — none of them write to the simulation.
