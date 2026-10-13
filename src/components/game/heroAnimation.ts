import * as THREE from "three";

export type HeroMotion = "idle" | "run" | "attack" | "cast" | "death";
export interface HeroClips {
  idle: string;
  run: string;
  attack: string;
  cast: string;
  death: string;
}

/** Ignore root translation tracks: world movement remains owned by the fixed-tick simulation. */
export function inPlaceClips(clips: THREE.AnimationClip[]) {
  return clips.map((source) => {
    const clip = source.clone();
    clip.tracks = clip.tracks.filter((track) => {
      if (!track.name.endsWith(".position")) return true;
      return !/^(root|armature|rig|rootmotion)(\.|\/)/i.test(track.name);
    });
    return clip;
  });
}

export function playHeroClip(
  actions: Record<string, THREE.AnimationAction | null>,
  previous: string | null,
  next: string,
  motion: HeroMotion,
  duration?: number,
) {
  const action = actions[next];
  if (!action) return previous;
  if (previous) actions[previous]?.fadeOut(0.12);
  const once = motion === "attack" || motion === "cast" || motion === "death";
  action.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
  action.clampWhenFinished = once;
  action.setEffectiveTimeScale(1);
  if (duration) action.setDuration(duration);
  action.fadeIn(0.12).play();
  return next;
}