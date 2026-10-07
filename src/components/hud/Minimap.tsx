import { useEffect, useRef } from "react";
import type { World } from "@/game/ecs/world";
import type { CamState } from "@/components/game/GameScene";
import { COLS, ROWS, walkable, terrain, MIN_X, MIN_Z, MAP_W, MAP_H } from "@/game/map/map";

const W = 220, H = Math.round((220 * MAP_H) / MAP_W);

export function Minimap({ w, cam }: { w: World; cam: CamState }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const bg = document.createElement("canvas");
    bg.width = COLS; bg.height = ROWS;
    const b = bg.getContext("2d")!;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      b.fillStyle = !walkable[i] ? "#16211a" : terrain[i] === 2 ? "#7a6646" : "#3d5a34";
      b.fillRect(x, y, 1, 1);
    }
    const ctx = ref.current!.getContext("2d")!;
    let raf = 0;
    const draw = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bg, 0, 0, W, H);
      const sx = (x: number) => ((x - MIN_X) / MAP_W) * W, sz = (z: number) => ((z - MIN_Z) / MAP_H) * H;
      for (const e of w.entities) {
        if (!e.alive || !e.visible) continue;
        const col = e.team === 0 ? "#5aa0ff" : e.team === 1 ? "#ff5f52" : "#e2c060";
        ctx.fillStyle = col;
        if (e.kind === "tower" || e.kind === "altar") {
          const s = e.kind === "altar" ? 8 : 6;
          ctx.fillRect(sx(e.pos.x) - s / 2, sz(e.pos.z) - s / 2, s, s);
          ctx.strokeStyle = "#0008"; ctx.strokeRect(sx(e.pos.x) - s / 2, sz(e.pos.z) - s / 2, s, s);
        } else {
          const r = e.kind === "hero" ? 4 : e.kind === "monster" ? 3 : 1.5;
          ctx.beginPath(); ctx.arc(sx(e.pos.x), sz(e.pos.z), r, 0, Math.PI * 2); ctx.fill();
          if (e.id === w.playerId) { ctx.strokeStyle = "#f2d27a"; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
        }
      }
      // retângulo da câmera
      const vw = cam.zoom * 1.25, vh = cam.zoom * 0.75;
      ctx.strokeStyle = "#f2e6c8aa";
      ctx.strokeRect(sx(cam.x - vw / 2), sz(cam.z - vh / 2), (vw / MAP_W) * W, (vh / MAP_H) * H);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [w, cam]);

  const onClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    cam.x = MIN_X + ((ev.clientX - r.left) / r.width) * MAP_W;
    cam.z = MIN_Z + ((ev.clientY - r.top) / r.height) * MAP_H;
    cam.locked = false;
  };
  return (
    <div className="panel-frame pointer-events-auto p-1.5">
      <canvas ref={ref} width={W} height={H} onMouseDown={onClick} className="block cursor-crosshair rounded-sm" />
      <p className="mt-1 text-center text-[10px] text-muted-foreground">Clique para mover a câmera · Espaço centraliza</p>
    </div>
  );
}
