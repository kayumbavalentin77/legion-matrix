import MissionMap from "@/components/mission-map";
import MapPreparationLayer from "@/components/map-preparation-layer";
import LogisticsRouteLayer from "@/components/logistics-route-layer";
import SavedAreasLayer from "@/components/saved-areas-layer";
import { Component, useState, type ComponentProps, type ReactNode } from "react";

// If Leaflet throws while the map is being torn down/rebuilt, remount a fresh map instead of blanking the page.
class MapBoundary extends Component<{ onReset: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  retries = 0;
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: unknown) {
    console.warn("LCPP map recovered from an error", error);
    if (++this.retries > 3) return; // stop retrying a persistent failure
    setTimeout(() => { this.props.onReset(); this.setState({ failed: false }); }, 0);
  }
  override render() {
    return this.state.failed
      ? <div className="flex h-[560px] w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">Reloading map…</div>
      : this.props.children;
  }
}

export default function LcppMap({map,preparation,routes,areas}: {areas:ComponentProps<typeof SavedAreasLayer>;map:ComponentProps<typeof MissionMap>;preparation:ComponentProps<typeof MapPreparationLayer>;routes:ComponentProps<typeof LogisticsRouteLayer>}) {
  const [generation, setGeneration] = useState(0);
  return (
    <MapBoundary onReset={() => setGeneration(g => g + 1)}>
      <MissionMap key={generation} {...map}><MapPreparationLayer {...preparation}/><SavedAreasLayer {...areas}/><LogisticsRouteLayer {...routes}/></MissionMap>
    </MapBoundary>
  );
}
