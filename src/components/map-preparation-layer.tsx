import type {} from "@geoman-io/leaflet-geoman-free";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import type { MapBounds, MapOverlay, MapPoint } from "@/lib/map-preparation";

export type MapTools = { bounds: () => MapBounds; zoomArea: (points: MapPoint[]) => void; capture: () => Promise<{url: string; scale: number; bounds: MapBounds}> };
export default function MapPreparationLayer({ boundary, tool, editing, overlay, imageUrl, grid, layer, onBoundary, onTools }: {boundary: MapPoint[]; tool: string; editing: boolean; overlay: MapOverlay | null; imageUrl: string; grid: boolean; layer: string; onBoundary: (points: MapPoint[]) => void; onTools: (tools: MapTools) => void}) {
  const map = useMap();
  const selection = useRef<L.Polygon | null>(null);
  const callback = useRef(onBoundary); callback.current = onBoundary;
  const boundaryRef=useRef(boundary);boundaryRef.current=boundary;
  // leaflet-geoman touches browser globals at import time, so it must load
  // only after hydration; never statically (SSR would crash).
  const [pmReady, setPmReady] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      import("@geoman-io/leaflet-geoman-free"),
      import("@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"),
    ]).then(() => { if (active) setPmReady(true); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const scale = L.control.scale({ imperial: false }).addTo(map);
    onTools({
      bounds: () => { const b=map.getBounds(); return [[b.getSouth(),b.getWest()],[b.getNorth(),b.getEast()]]; },
      zoomArea: points => { if (points.length) map.fitBounds(L.latLngBounds(points.map(p => [p.lat,p.lng])), {padding:[15,15]}); },
      capture: async () => {
        const container = map.getContainer();
        await new Promise(resolve => setTimeout(resolve, 650));
        const {toPng} = await import("html-to-image");
        let url = await toPng(container, {pixelRatio:2, filter: node => !(node instanceof HTMLElement && (node.classList.contains("leaflet-control-zoom") || node.classList.contains("marker-icon") || node.classList.contains("leaflet-pm-toolbar")))});
        const b=map.getBounds(); const size=map.getSize();
        const selected=boundaryRef.current;
        let outputBounds:MapBounds=[[b.getSouth(),b.getWest()],[b.getNorth(),b.getEast()]];
        if(selected.length>=3) {
          const vertices=selected.map(p=>map.latLngToContainerPoint([p.lat,p.lng]));
          const left=Math.max(0,Math.floor(Math.min(...vertices.map(p=>p.x))));
          const top=Math.max(0,Math.floor(Math.min(...vertices.map(p=>p.y))));
          const right=Math.min(size.x,Math.ceil(Math.max(...vertices.map(p=>p.x))));
          const bottom=Math.min(size.y,Math.ceil(Math.max(...vertices.map(p=>p.y))));
          if(right>left && bottom>top) {
            const image=new Image();image.src=url;await image.decode();
            const canvas=document.createElement("canvas");canvas.width=(right-left)*2;canvas.height=(bottom-top)*2;
            const context=canvas.getContext("2d");
            if(context) {
              context.drawImage(image,left*2,top*2,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
              context.globalCompositeOperation="destination-in";context.beginPath();
              vertices.forEach((p,index)=>{if(index===0)context.moveTo((p.x-left)*2,(p.y-top)*2);else context.lineTo((p.x-left)*2,(p.y-top)*2);});
              context.closePath();context.fill();url=canvas.toDataURL("image/png");
              const sw=map.containerPointToLatLng([left,bottom]),ne=map.containerPointToLatLng([right,top]);
              outputBounds=[[sw.lat,sw.lng],[ne.lat,ne.lng]];
            }
          }
        }
        const metres=map.distance(map.containerPointToLatLng([0,size.y/2]),map.containerPointToLatLng([size.x,size.y/2]));
        return {url,scale:metres/size.x,bounds:outputBounds};
      },
    });
    return () => { scale.remove(); };
  },[map,onTools]);
  useEffect(() => {
    if (!pmReady) return;
    const created = (event: {layer: L.Layer}) => {
      if (!(event.layer instanceof L.Polygon)) return;
      const points = (event.layer.getLatLngs()[0] as L.LatLng[]).map(p => ({lat:p.lat,lng:p.lng}));
      event.layer.remove(); callback.current(points); map.pm.disableDraw();
    };
    map.on("pm:create",created);
    return () => { map.off("pm:create",created); };
  },[map,pmReady]);
  useEffect(() => {
    if (!pmReady) return;
    map.pm.disableDraw();
    if (tool === "rectangle") map.pm.enableDraw("Rectangle",{pathOptions:{color:getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()}});
    if (tool === "polygon") map.pm.enableDraw("Polygon");
    if (tool === "freehand") {
      map.dragging.disable(); let drawing=false; let points:MapPoint[]=[];
      const down=(event:L.LeafletMouseEvent)=>{drawing=true;points=[{lat:event.latlng.lat,lng:event.latlng.lng}];};
      const move=(event:L.LeafletMouseEvent)=>{if(drawing) { points.push({lat:event.latlng.lat,lng:event.latlng.lng}); callback.current([...points]); }};
      const up=()=>{if(drawing){drawing=false;callback.current(points.length>=3?points:[]);}};
      map.on("mousedown",down);map.on("mousemove",move);map.on("mouseup",up);
      return()=>{map.off("mousedown",down);map.off("mousemove",move);map.off("mouseup",up);map.dragging.enable();};
    }
    return()=>{map.pm.disableDraw();};
  },[map,tool,pmReady]);
  useEffect(() => {
    selection.current?.remove(); selection.current=null;
    if(boundary.length < 3) return;
    const polygon=L.polygon(boundary.map(p=>[p.lat,p.lng] as [number,number]),{color:getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),fillOpacity:0.06}).addTo(map);
    selection.current=polygon;
    if(editing && pmReady) polygon.pm.enable({allowSelfIntersection:false});
    const update=()=>callback.current((polygon.getLatLngs()[0] as L.LatLng[]).map(p=>({lat:p.lat,lng:p.lng})));
    polygon.on("pm:edit",update);
    return()=>{polygon.remove();};
  },[map,boundary,editing,pmReady]);
  useEffect(()=>{
    if(!overlay || !imageUrl) return;
    const image=L.imageOverlay(imageUrl,overlay.bounds,{opacity:overlay.opacity,interactive:false,crossOrigin:"anonymous",pmIgnore:true}).addTo(map);
    const rotate=()=>{const element=image.getElement();if(element) {element.style.transform=element.style.transform.replace(/ rotate\([^)]*\)/g,"")+` rotate(${overlay.rotation}deg)`;element.style.transformOrigin="center";}};
    image.on("load",rotate);map.on("zoomend moveend",rotate);
    return()=>{image.remove();map.off("zoomend moveend",rotate);};
  },[map,overlay,imageUrl]);
  useEffect(()=>{
    if(layer !== "topographic") return;
    const tiles=L.tileLayer("https://tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,crossOrigin:"anonymous",attribution:'Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap (CC-BY-SA)'}).addTo(map);
    return()=>{tiles.remove();};
  },[map,layer]);
  useEffect(()=>{
    if(!grid) return;
    const group=L.layerGroup().addTo(map);
    const draw=()=>{
      group.clearLayers(); const b=map.getBounds();const step=Math.pow(10,Math.floor(Math.log10(Math.max(b.getNorth()-b.getSouth(),b.getEast()-b.getWest())/4)));
      const color=getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground").trim();
      for(let lat=Math.ceil(b.getSouth()/step)*step;lat<b.getNorth();lat+=step) {L.polyline([[lat,b.getWest()],[lat,b.getEast()]],{color,weight:1,opacity:0.5,pmIgnore:true}).addTo(group);L.marker([lat,b.getWest()+step/5],{icon:L.divIcon({className:"map-grid-label",html:`${lat.toFixed(4)}°`,iconSize:[80,15]}),pmIgnore:true}).addTo(group);}
      for(let lng=Math.ceil(b.getWest()/step)*step;lng<b.getEast();lng+=step) {L.polyline([[b.getSouth(),lng],[b.getNorth(),lng]],{color,weight:1,opacity:0.5,pmIgnore:true}).addTo(group);L.marker([b.getNorth()-step/5,lng],{icon:L.divIcon({className:"map-grid-label",html:`${lng.toFixed(4)}°`,iconSize:[80,15]}),pmIgnore:true}).addTo(group);}
    };draw();map.on("moveend",draw);return()=>{group.remove();map.off("moveend",draw);};
  },[map,grid]);
  return null;
}
