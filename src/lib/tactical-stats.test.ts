import { describe, expect, it } from "vitest";
import { tacticalStatsSchema } from "./tactical-stats";

const valid = { heroId: "mage", result: "defeat", minutes: 12, level: 8, kills: 2, deaths: 5, assists: 3, cs: 40, gold: 600, items: ["staff"], context: "" };
describe("tactical statistics", () => {
  it("accepts complete match statistics", () => expect(tacticalStatsSchema.safeParse(valid).success).toBe(true));
  it("rejects negative counts", () => expect(tacticalStatsSchema.safeParse({ ...valid, deaths: -1 }).success).toBe(false));
  it("rejects more than six items", () => expect(tacticalStatsSchema.safeParse({ ...valid, items: Array(7).fill("boots") }).success).toBe(false));
});