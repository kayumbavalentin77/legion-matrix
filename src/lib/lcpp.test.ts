import { describe, expect, it } from "bun:test";
import { estimatedCost, rankRoutes, type RoadRoute } from "./lcpp";

const routes: RoadRoute[] = [{ id: "a", distanceKm: 100, durationMinutes: 120, path: [] }, { id: "b", distanceKm: 120, durationMinutes: 60, path: [] }];
const costs = { fuelPer100Km: 10, fuelPrice: 1500, hourlyCost: 5000, fixedCost: 2000 };
describe("general logistics estimates", () => {
  it("combines distance-based fuel, travel-time cost and fixed cost", () => expect(estimatedCost(routes[0] as RoadRoute, costs)).toBe(27000));
  it("selects the lowest estimated cost without inventing alternatives", () => expect(rankRoutes(routes, costs, "cost").map(r => r.id)).toEqual(["b", "a"]));
  it("ranks distance separately from travel time", () => { expect(rankRoutes(routes, costs, "distance")[0]?.id).toBe("a"); expect(rankRoutes(routes, costs, "time")[0]?.id).toBe("b"); });
  it("rejects negative cost assumptions", () => expect(() => estimatedCost(routes[0] as RoadRoute, { ...costs, fuelPrice: -1 })).toThrow());
});