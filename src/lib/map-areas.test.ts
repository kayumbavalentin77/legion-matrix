import { test } from "node:test";
import assert from "node:assert/strict";
import { areaFromGeoJSON, areaToGeoJSON, perimeterKm, pointInArea } from "./map-areas";

const square = [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 1 }, { lat: 1, lng: 0 }];

test("point inside / outside area", () => {
  assert.equal(pointInArea({ lat: 0.5, lng: 0.5 }, square), true);
  assert.equal(pointInArea({ lat: 2, lng: 0.5 }, square), false);
});

test("perimeter of 1° square near equator ≈ 444.8 km", () => {
  assert.ok(Math.abs(perimeterKm(square) - 444.8) < 1);
});

test("GeoJSON round trip keeps the ring", () => {
  const back = areaFromGeoJSON(JSON.stringify(areaToGeoJSON("Sq", square)));
  assert.equal(back.name, "Sq");
  assert.deepEqual(back.ring, square);
});

test("rejects files without polygons", () => {
  assert.throws(() => areaFromGeoJSON('{"type":"Point","coordinates":[0,0]}'));
});
