import { z } from "zod";

const count = z.number().finite().int().min(0).max(10000);
export const tacticalStatsSchema = z.object({
  heroId: z.enum(["warrior", "mage", "archer", "support"]),
  result: z.enum(["victory", "defeat", "ongoing"]),
  minutes: z.number().finite().min(0.1).max(180),
  level: z.number().int().min(1).max(18),
  kills: count,
  deaths: count,
  assists: count,
  cs: count,
  gold: z.number().finite().int().min(0).max(1000000),
  items: z.array(z.enum(["blade", "staff", "plate", "crystal", "boots", "bow", "amulet", "cloak", "colossus", "grimoire", "dusk", "aegis"])).max(6),
  context: z.string().trim().max(1200),
}).strict();
export type TacticalStats = z.infer<typeof tacticalStatsSchema>;