import { describe, expect, it } from "bun:test";
import { rankRoutes, type RoadRoute } from "./lcpp";
const routes: RoadRoute[] = [{ id: "a", distanceKm: 100, durationMinutes: 120, path: [] }, { id: "b", distanceKm: 120, durationMinutes: 60, path: [] }];
describe("general logistics estimates", () => {
  it("ranks distance separately from travel time", () => { expect(rankRoutes(routes, "distance")[0]?.id).toBe("a"); expect(rankRoutes(routes, "time")[0]?.id).toBe("b"); });
  it("does not invent alternatives", () => expect(rankRoutes(routes.slice(0, 1), "distance")).toHaveLength(1));
});
