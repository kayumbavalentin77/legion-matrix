import L from "leaflet";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { LeafletContext, createLeafletContext, type LeafletContextInterface } from "@react-leaflet/core";

/**
 * Drop-in replacement for react-leaflet's MapContainer.
 * MapContainer destroys its Leaflet map when React pauses the map's effects (e.g. while part of the page
 * is loading) but keeps handing the destroyed map to its layers when React resumes, which crashes with
 * "this.getPane() is undefined". Here the map is created inside the effect, so every resume gets a fresh map.
 */
export function StableMapContainer({
  center,
  zoom,
  className,
  style,
  children,
}: {
  center: [number, number];
  zoom: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const view = useRef({ center, zoom });
  const [context, setContext] = useState<LeafletContextInterface | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const map = new L.Map(node).setView(view.current.center, view.current.zoom);
    setContext(createLeafletContext(map));
    return () => {
      // Remember where the user was so a rebuilt map opens at the same spot.
      view.current = { center: [map.getCenter().lat, map.getCenter().lng], zoom: map.getZoom() };
      setContext(null);
      map.remove();
    };
  }, []);

  return (
    <div ref={nodeRef} className={className} style={style}>
      {context ? <LeafletContext value={context}>{children}</LeafletContext> : null}
    </div>
  );
}
