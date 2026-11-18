import { useEffect, useMemo } from "react";
import { installGameDebug } from "@/game/debug";
import { createMatch } from "@/game/game";
import { resetHud } from "@/game/store";
import { GameScene, type CamState } from "./GameScene";
import { Hud } from "@/components/hud/Hud";
import { createTouchInput } from "@/game/touch-input";

export default function Match({ heroId, guided, onExit, onRestart }: { heroId: string; guided: boolean; onExit: () => void; onRestart: () => void }) {
  const w = useMemo(() => { resetHud(); return createMatch(heroId); }, [heroId]);
  const cam = useMemo<CamState>(() => ({ x: -58, z: 0, zoom: 28, locked: true }), []);
  const input = useMemo(createTouchInput, [w]);
  useEffect(() => installGameDebug(w), [w]);
  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <GameScene w={w} cam={cam} input={input} />
      <Hud w={w} cam={cam} input={input} guided={guided} onExit={onExit} onRestart={onRestart} />
    </div>
  );
}
