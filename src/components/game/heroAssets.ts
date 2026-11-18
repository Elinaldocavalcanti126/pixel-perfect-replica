import type { HeroClips } from "./heroAnimation";

export interface HeroAsset {
  url: string;
  animationUrl?: string;
  weapon?: { url: string; anchor: string; pivot: string };
  accessories: string[];
  height: number;
  clips: HeroClips;
}

const allParts = ["*"];
const clips = (attack: string, cast = attack): HeroClips => ({
  idle: "Idle",
  run: "Run",
  attack,
  cast,
  death: "Death",
});

/** CC0 fantasy rigs with class-specific combat clips for clearer lane silhouettes. */
export const HERO_ASSETS: Record<string, HeroAsset> = {
  warrior: {
    url: "/models/heroes/quaternius/Warrior.glb",
    accessories: allParts,
    height: 2.35,
    clips: clips("Sword_Attack", "Sword_AttackFast"),
  },
  mage: {
    url: "/models/heroes/quaternius/Wizard.glb",
    accessories: allParts,
    height: 2.3,
    clips: clips("Staff_Attack", "Spell1"),
  },
  archer: {
    url: "/models/heroes/quaternius-modular/male-ranger/Male_Ranger.gltf",
    animationUrl: "/models/animations/quaternius-ual1/UAL1_Standard.glb",
    weapon: { url: "/models/heroes/quaternius/Ranger.glb", anchor: "hand_r", pivot: "Weapon.R" },
    accessories: allParts,
    height: 2.3,
    clips: {
      idle: "Idle_Loop",
      run: "Jog_Fwd_Loop",
      attack: "Pistol_Shoot",
      cast: "Spell_Simple_Shoot",
      death: "Death01",
    },
  },
  support: {
    url: "/models/heroes/quaternius/Cleric.glb",
    accessories: allParts,
    height: 2.3,
    clips: clips("Staff_Attack", "Spell1"),
  },
  veyra: {
    url: "/models/heroes/quaternius/Rogue.glb",
    accessories: allParts,
    height: 2.22,
    clips: clips("Dagger_Attack", "Dagger_Attack2"),
  },
  maelis: {
    url: "/models/heroes/quaternius/Monk.glb",
    accessories: allParts,
    height: 2.25,
    clips: clips("Attack2", "Punch"),
  },
};
