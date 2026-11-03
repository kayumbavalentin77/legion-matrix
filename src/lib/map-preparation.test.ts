import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { boundaryAreaKm2, validBounds } from "./map-preparation";
describe("map preparation", () => {
  it("estimates geographic area rather than screen pixels", () => assert.ok(Math.abs(boundaryAreaKm2([{lat:0,lng:0},{lat:0,lng:1},{lat:1,lng:1},{lat:1,lng:0}])-12363.72)<0.5));
  it("requires north/south and east/west bounds in geographic ranges", () => { assert.equal(validBounds([[-2,30],[-1,31]]),true); assert.equal(validBounds([[95,30],[96,31]]),false); assert.equal(validBounds([[-1,31],[-2,30]]),false); });
});