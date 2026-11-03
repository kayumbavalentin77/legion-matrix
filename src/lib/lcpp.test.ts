import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankRoutes, type RoadRoute } from "./lcpp";
const routes: RoadRoute[] = [{ id: "a", distanceKm: 100, durationMinutes: 120, path: [] }, { id: "b", distanceKm: 120, durationMinutes: 60, path: [] }];
describe("general logistics estimates", () => {
  it("ranks distance separately from travel time", () => { assert.equal(rankRoutes(routes, "distance")[0]?.id,"a"); assert.equal(rankRoutes(routes, "time")[0]?.id,"b"); });
  it("does not invent alternatives", () => assert.equal(rankRoutes(routes.slice(0, 1), "distance").length,1));
});
