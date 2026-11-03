import { useEffect, useRef, useState, type RefObject } from "react";
import { Edit, Loader2, Move, Printer, RotateCw, Save, Trash2, Upload, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { usePresets } from "@/lib/presets";
import { boundaryAreaKm2, readMapImage, validBounds, type MapBounds, type MapOverlay, type MapSheet } from "@/lib/map-preparation";
import type { MapTools } from "@/components/map-preparation-layer";
import { MapPrintDialog, type MapCapture } from "@/components/map-print-dialog";

export function MapPreparationPanel({sheet,onSheet,tools,editing,onEditing,imageUrl,onImageUrl}: {sheet:MapSheet;onSheet:(sheet:MapSheet)=>void;tools:RefObject<MapTools|null>;editing:boolean;onEditing:(value:boolean)=>void;imageUrl:string;onImageUrl:(value:string)=>void}) {
  const [busy,setBusy]=useState(false),[capture,setCapture]=useState<MapCapture|null>(null),[confirmRemove,setConfirmRemove]=useState(false);
  const [mapName,setMapName]=useState("");
  const [boundsDraft,setBoundsDraft]=useState<MapBounds>([[-2,30],[-1,31]]);
  const fileInput=useRef<HTMLInputElement>(null);
  const saved=usePresets("lcpp-maps");
  const [deleteId,setDeleteId]=useState<string|null>(null);
  useEffect(()=>{if(sheet.overlay)setBoundsDraft(sheet.overlay.bounds);},[sheet.overlay?.bounds]);
  useEffect(()=>{
    if(!sheet.overlay?.path){onImageUrl("");return;}
    let active=true; const path=sheet.overlay.path;
    const load=async()=>{const {data,error}=await supabase.storage.from("lcpp-map-images").createSignedUrl(path,3600);if(active){if(error)toast.error("Unable to load your saved map image.");else onImageUrl(data?.signedUrl ?? "");}};
    load();const timer=setInterval(load,3000000);return()=>{active=false;clearInterval(timer);};
  },[sheet.overlay?.path,onImageUrl]);
  async function upload(file: File | undefined) {
    if(!file || !tools.current)return;setBusy(true);
    try {
      const rendered=await readMapImage(file);
      const {data}=await supabase.auth.getUser();if(!data.user)throw new Error("Sign in to upload a map image.");
      const path=`${data.user.id}/${crypto.randomUUID()}.${rendered.blob.type === "image/jpeg" ? "jpg" : "png"}`;
      const {error}=await supabase.storage.from("lcpp-map-images").upload(path,rendered.blob,{contentType:rendered.blob.type,upsert:false});if(error)throw error;
      const overlay:MapOverlay={path,name:file.name,bounds:rendered.bounds ?? tools.current.bounds(),georeferenced:!!rendered.bounds,rotation:0,opacity:0.65};
      onSheet({...sheet,overlay});toast.success("Map image uploaded privately. Save the map to retain its placement.");
      if(rendered.bounds)tools.current.zoomArea([{lat:rendered.bounds[0][0],lng:rendered.bounds[0][1]},{lat:rendered.bounds[1][0],lng:rendered.bounds[1][1]}]);
    } catch(e){toast.error(e instanceof Error ? e.message : "Map image upload failed.");}finally{setBusy(false);if(fileInput.current)fileInput.current.value="";}
  }
  async function preview() {
    if(!tools.current || sheet.boundary.length<3)return;setBusy(true);
    try{tools.current.zoomArea(sheet.boundary);setCapture(await tools.current.capture());}catch{toast.error("Map capture failed. A map provider may block image export; try the street layer.");}finally{setBusy(false);}
  }
  const changeOverlay=(patch:Partial<MapOverlay>)=>{if(sheet.overlay)onSheet({...sheet,overlay:{...sheet.overlay,...patch}});};
  return <>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">Map image upload</CardTitle></CardHeader><CardContent className="space-y-3">
        <Input ref={fileInput} type="file" accept="image/png,image/jpeg,.tif,.tiff" className="hidden" aria-label="Map image file" onChange={e=>upload(e.target.files?.[0])}/>
        <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={()=>fileInput.current?.click()}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Upload className="mr-2 h-4 w-4"/>}{sheet.overlay?"Replace map image":"Upload map image"}</Button>{sheet.overlay&&<Button size="sm" variant="outline" onClick={()=>setConfirmRemove(true)}><Trash2 className="mr-2 h-4 w-4"/>Remove image</Button>}</div>
        <p className="text-xs text-muted-foreground">JPG / PNG or RGB GeoTIFF · up to 20 MB. EPSG:4326 and EPSG:3857 metadata supported; other projections require manual bounds or GIS preprocessing.</p>
        {sheet.overlay&&<>
          <p className="break-words text-sm font-medium">{sheet.overlay.name}</p><p className="text-xs text-muted-foreground">{sheet.overlay.georeferenced ? "Georeferenced image (geographic bounds)" : "Unreferenced overlay · manually positioned, not surveyed"}</p>
          {imageUrl&&<img src={imageUrl} alt="Uploaded map image preview" className="h-40 w-full rounded-md border object-contain"/>}
          <Label>Opacity · {Math.round(sheet.overlay.opacity*100)}%</Label><Slider aria-label="Image opacity" min={0} max={1} step={0.05} value={[sheet.overlay.opacity]} onValueChange={value=>changeOverlay({opacity:value[0]??0.65})}/>
          <Label>Rotation · {sheet.overlay.rotation}°</Label><Slider aria-label="Image rotation" min={-180} max={180} step={1} value={[sheet.overlay.rotation]} onValueChange={value=>changeOverlay({rotation:value[0]??0,georeferenced:false})}/>
          <div className="grid grid-cols-2 gap-2">{([{label:"South latitude",i:0,j:0},{label:"West longitude",i:0,j:1},{label:"North latitude",i:1,j:0},{label:"East longitude",i:1,j:1}] as const).map(field=><div className="space-y-1" key={field.label}><Label>{field.label}</Label><Input aria-label={field.label} type="number" step="any" value={boundsDraft[field.i][field.j]} onChange={e=>{const draft:MapBounds=[[...boundsDraft[0]],[...boundsDraft[1]]];draft[field.i][field.j]=Number(e.target.value);setBoundsDraft(draft);}}/></div>)}</div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>{if(!validBounds(boundsDraft)){toast.error("Enter valid south/west/north/east geographic bounds.");return;}changeOverlay({bounds:boundsDraft,georeferenced:true,rotation:0});}}><Move className="mr-1 h-4 w-4"/>Apply geographic bounds</Button><Button size="sm" variant="outline" onClick={()=>{if(tools.current)changeOverlay({bounds:tools.current.bounds(),georeferenced:false});}}>Place in current view</Button><Button size="sm" variant="ghost" onClick={()=>changeOverlay({rotation:0})}><RotateCw className="mr-1 h-4 w-4"/>Reset rotation</Button></div>
        </>}
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Selected geographical area</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2"><Button size="sm" variant={editing?"default":"outline"} disabled={sheet.boundary.length<3} onClick={()=>onEditing(!editing)}><Edit className="mr-1 h-4 w-4"/>{editing?"Finish editing":"Edit boundary"}</Button><Button size="sm" variant="outline" disabled={sheet.boundary.length<3} onClick={()=>tools.current?.zoomArea(sheet.boundary)}><ZoomIn className="mr-1 h-4 w-4"/>Zoom to area</Button><Button size="sm" variant="ghost" onClick={()=>{onSheet({...sheet,boundary:[]});onEditing(false);}}>Clear selection</Button></div>
        <p className="text-sm">Approximate area: <strong className="tabular-nums">{boundaryAreaKm2(sheet.boundary).toFixed(3)} km²</strong></p>
        <div className="max-h-36 overflow-auto text-xs tabular-nums">{sheet.boundary.length<3?<p className="text-muted-foreground">No area selected.</p>:sheet.boundary.map((p,i)=><p key={i}>{i+1}. {p.lat.toFixed(6)}°, {p.lng.toFixed(6)}°</p>)}</div>
        <Label htmlFor="map-title">Map title</Label><Input id="map-title" value={sheet.title} maxLength={100} onChange={e=>onSheet({...sheet,title:e.target.value})}/>
        <Label>Map data layer</Label><Select value={sheet.layer} onValueChange={layer=>onSheet({...sheet,layer})}><SelectTrigger aria-label="Map data layer"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="street">OpenStreetMap · Streets</SelectItem><SelectItem value="topographic">OpenTopoMap · Terrain / contours</SelectItem><SelectItem value="satellite">Esri · Satellite imagery</SelectItem></SelectContent></Select>
        <p className="text-xs text-muted-foreground">OpenTopoMap uses OpenStreetMap and SRTM, with terrain shading and contour lines where available. Community service availability varies; no elevation values or contours are invented.</p>
        <div className="flex items-center gap-2"><Checkbox id="coordinate-grid" checked={sheet.grid} onCheckedChange={checked=>onSheet({...sheet,grid:checked===true})}/><Label htmlFor="coordinate-grid">Coordinate grid and labels</Label></div>
        <p className="text-xs text-muted-foreground">Scale bar · north arrow · title and legend included in print output. Scale is calculated from the captured area and paper size, not certified survey scale.</p>
      </Card>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Map printing and export</CardTitle></CardHeader><CardContent className="flex flex-wrap items-end gap-3">
      <div className="space-y-1"><Label>Paper size</Label><Select value={sheet.paper} onValueChange={value=>onSheet({...sheet,paper:value as MapSheet['paper']})}><SelectTrigger aria-label="Paper size" className="w-32"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="a4">A4</SelectItem><SelectItem value="a3">A3</SelectItem><SelectItem value="a2">A2</SelectItem></SelectContent></Select></div>
      <div className="space-y-1"><Label>Orientation</Label><Select value={sheet.orientation} onValueChange={value=>onSheet({...sheet,orientation:value as MapSheet['orientation']})}><SelectTrigger aria-label="Orientation" className="w-40"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="portrait">Portrait</SelectItem><SelectItem value="landscape">Landscape</SelectItem></SelectContent></Select></div>
      <Button disabled={busy||sheet.boundary.length<3} onClick={preview}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Printer className="mr-2 h-4 w-4"/>}Print map / Preview</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Saved maps</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="Saved map name" placeholder="Map name…" value={mapName} maxLength={100} onChange={e=>setMapName(e.target.value)}/><Button disabled={!mapName.trim()||saved.save.isPending||(!sheet.overlay&&sheet.boundary.length<3)} onClick={async()=>{try{await saved.save.mutateAsync({name:mapName,config:{query:"",filters:{sheet:JSON.stringify(sheet)}}});setMapName("");}catch{}}}><Save className="mr-2 h-4 w-4"/>Save map</Button></div>
      <p className="text-xs text-muted-foreground">Maps and images are private to your account. Reusing a name replaces that saved map.</p>
      {saved.presets.length===0?<p className="text-sm text-muted-foreground">No saved maps.</p>:saved.presets.map(preset=><div key={preset.id} className="flex flex-wrap justify-between gap-2 border-b pb-2"><p className="break-words text-sm">{preset.name}</p><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>{try{const restored=JSON.parse(preset.config.filters['sheet']??"") as MapSheet;if(!Array.isArray(restored.boundary)||!restored.layer)throw new Error();if(restored.overlay&&!validBounds(restored.overlay.bounds))throw new Error();onSheet(restored);tools.current?.zoomArea(restored.boundary.length?restored.boundary:restored.overlay?[{lat:restored.overlay.bounds[0][0],lng:restored.overlay.bounds[0][1]},{lat:restored.overlay.bounds[1][0],lng:restored.overlay.bounds[1][1]}]:[]);toast.success("Saved map opened");}catch{toast.error("This saved map could not be opened.");}}}>Open map</Button><Button size="icon" variant="ghost" aria-label={`Delete saved map ${preset.name}`} onClick={()=>setDeleteId(preset.id)}><Trash2 className="h-4 w-4"/></Button></div></div>)}
    </CardContent></Card>
    <MapPrintDialog capture={capture} sheet={sheet} onClose={()=>setCapture(null)}/>
    <Dialog open={confirmRemove||!!deleteId} onOpenChange={open=>{if(!open){setConfirmRemove(false);setDeleteId(null);}}}><DialogContent><DialogHeader><DialogTitle>{deleteId?"Delete saved map?":"Remove image from this map?"}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{deleteId?"Only this saved map configuration is removed.":"The image remains privately stored for any saved maps that use it."}</p><DialogFooter><Button variant="outline" onClick={()=>{setConfirmRemove(false);setDeleteId(null);}}>Cancel</Button><Button variant="destructive" onClick={async()=>{if(deleteId){try{await saved.remove.mutateAsync(deleteId);setDeleteId(null);}catch{}}else{onSheet({...sheet,overlay:null});setConfirmRemove(false);}}}>Remove</Button></DialogFooter></DialogContent></Dialog>
  </>;
}