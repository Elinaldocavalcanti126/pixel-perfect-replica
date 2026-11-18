# Previous prototype hero models

KayKit Adventurers Character Pack 1.0 by Kay Lousberg.

- Source: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- Creator: https://kaylousberg.itch.io/kaykit-adventurers
- License: Creative Commons Zero (CC0), verified in the source pack's LICENSE.txt on 2026-10-13.
- https://creativecommons.org/publicdomain/zero/1.0/

The original `Knight.glb`, `Mage.glb`, and `Rogue_Hooded.glb` character files are included under `public/models/heroes` so local copies of the game do not depend on a hosted asset service. Thorvak uses the Knight rig, Ilyra and Seravin use the Mage rig with different costume/accessory selections and tint, and Kaelis uses the hooded Rogue rig with the ranged crossbow. The game filters the visible character parts and animation clips at runtime.

Source repository: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
Pinned source revision: `672074b73ba276876a19e8816ecdc5241817ab47`

## Original lane hero rigs

The five original lane hero rigs other than the Kaelis pilot use models from Quaternius' RPG Character Pack (Cleric, Monk, Rogue, Warrior, Wizard), published under CC0. Original model files are in `public/models/heroes/quaternius`; their animations and materials are recolored by Arcana Rift at runtime.

- Source pack: https://quaternius.com/packs/rpgcharacters.html
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Models are converted GLB files from the official Quaternius pack.

## CC0 visual pilot: modular ranger and universal animations

- `public/models/heroes/quaternius-modular/male-ranger/Male_Ranger.gltf` and its adjacent texture/binary files are from Quaternius' Modular Character Outfits - Fantasy (Male Ranger outfit).
- Source: https://quaternius.itch.io/modular-character-outfits-fantasy
- License: Creative Commons Zero (CC0), verified on the official pack page and `License.txt` from the standard pack.
- `public/models/animations/quaternius-ual1/UAL1_Standard.glb` is from Quaternius' Universal Animation Library (standard Unreal/Godot export).
- Source: https://quaternius.itch.io/universal-animation-library
- License: Creative Commons Zero (CC0), verified on the official pack page and `License.txt` from the standard pack.
- The ranger is a 65-bone Humanoid rig and uses the matching Universal Animation Library tracks for idle, jog, attack, spell, and death. The model has no embedded animation clips.
