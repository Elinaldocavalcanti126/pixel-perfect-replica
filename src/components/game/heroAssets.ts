import warrior from "@/assets/heroes/thorvak.glb.asset.json";
import mage from "@/assets/heroes/ilyra.glb.asset.json";
import archer from "@/assets/heroes/kaelis.glb.asset.json";
import support from "@/assets/heroes/seravin.glb.asset.json";
import type { HeroClips } from "./heroAnimation";

export interface HeroAsset {
  url: string;
  accessories: string[];
  height: number;
  clips: HeroClips;
}
const spells = { idle: "Idle", run: "Running_A", attack: "Spellcast_Shoot", cast: "Spellcast_Raise", death: "Death_A" };
export const HERO_ASSETS: Record<string, HeroAsset> = {
  warrior: { url: warrior.url, accessories: ["1H_Sword", "Round_Shield", "Knight_Helmet", "Knight_Cape"], height: 2.25,
    clips: { ...spells, attack: "1H_Melee_Attack_Slice_Horizontal", cast: "Block" } },
  mage: { url: mage.url, accessories: ["1H_Wand", "Spellbook_open", "Mage_Hat", "Mage_Cape"], height: 2.3, clips: spells },
  archer: { url: archer.url, accessories: ["2H_Crossbow", "Rogue_Cape"], height: 2.15,
    clips: { ...spells, attack: "2H_Ranged_Shoot", cast: "1H_Ranged_Shoot" } },
  support: { url: support.url, accessories: ["2H_Staff", "Spellbook", "Mage_Cape"], height: 2.15, clips: spells },
};