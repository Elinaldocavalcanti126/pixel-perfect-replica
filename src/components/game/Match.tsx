import { useEffect, useMemo } from "react";
import { installGameDebug } from "@/game/debug";
import { createMatch } from "@/game/game";
import { resetHud } from "@/game/store";
import { GameScene, type CamState } from "./GameScene";
import { Hud } from "@/components/hud/Hud";

export default function Match({ heroId, onExit }: { heroId: string; onExit: () => void }) {
  const w = useMemo(() => { resetHud(); return createMatch(heroId); }, [heroId]);
  const cam = useMemo<CamState>(() => ({ x: -58, z: 0, zoom: 28, locked: true }), []);
  useEffect(() => installGameDebug(w), [w]);
  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <GameScene w={w} cam={cam} />
      <Hud w={w} cam={cam} onExit={onExit} />
    </div>
  );
}
