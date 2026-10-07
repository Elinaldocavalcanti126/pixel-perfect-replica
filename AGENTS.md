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
- Game state lives outside React in `src/game` (lightweight ECS World + systems, fixed 30 Hz tick); React only renders the 3D view and HUD — keeps simulation deterministic and ready for networked multiplayer.
- Player actions go through command functions in `src/game/game.ts` — they are the seam for future network input sync.
- Pathfinding is grid A* over the walkable map with line-of-sight smoothing — avoids a navmesh asset pipeline.
