import { describe, expect, it } from "bun:test";
import { boundaryAreaKm2, validBounds } from "./map-preparation";
describe("map preparation", () => {
  it("estimates geographic area rather than screen pixels", () => expect(boundaryAreaKm2([{lat:0,lng:0},{lat:0,lng:1},{lat:1,lng:1},{lat:1,lng:0}])).toBeCloseTo(12363.72, 0));
  it("requires north/south and east/west bounds in geographic ranges", () => { expect(validBounds([[-2,30],[-1,31]])).toBe(true); expect(validBounds([[95,30],[96,31]])).toBe(false); expect(validBounds([[-1,31],[-2,30]])).toBe(false); });
});