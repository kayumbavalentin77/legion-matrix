import MissionMap from "@/components/mission-map";
import MapPreparationLayer from "@/components/map-preparation-layer";
import LogisticsRouteLayer from "@/components/logistics-route-layer";
import type { ComponentProps } from "react";

export default function LcppMap({map,preparation,routes}: {map:ComponentProps<typeof MissionMap>;preparation:ComponentProps<typeof MapPreparationLayer>;routes:ComponentProps<typeof LogisticsRouteLayer>}) {
  return <MissionMap {...map}><MapPreparationLayer {...preparation}/><LogisticsRouteLayer {...routes}/></MissionMap>;
}