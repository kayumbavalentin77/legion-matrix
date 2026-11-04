import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MapSheet } from "@/lib/map-preparation";

export type MapCapture = { url: string; scale: number; bounds: [[number,number],[number,number]] };
export function MapPrintDialog({ capture, sheet, onClose }: {capture: MapCapture | null; sheet: MapSheet; onClose: () => void}) {
  const [busy,setBusy]=useState(false);
  async function output(print: boolean) {
    if (!capture) return;
    setBusy(true);
    try {
      const {jsPDF}=await import("jspdf");
      const pdf=new jsPDF({orientation:sheet.orientation,unit:"mm",format:sheet.paper});
      const width=pdf.internal.pageSize.getWidth(), height=pdf.internal.pageSize.getHeight();
      pdf.setFontSize(18);pdf.text(sheet.title || "Selected map area",12,18);
      pdf.setFontSize(9);pdf.text(`WGS84 · ${sheet.layer === "topographic" ? "OpenTopoMap / OSM / SRTM" : sheet.layer === "satellite" ? "Esri World Imagery" : "OpenStreetMap"}`,12,26);
      const image=new Image();image.src=capture.url;await image.decode();
      const imageWidth=width-24, imageHeight=Math.min(height-92,imageWidth*image.height/image.width);
      const actualWidth=Math.min(imageWidth,imageHeight*image.width/image.height);
      pdf.addImage(capture.url,"PNG",12,32,actualWidth,imageHeight);
      const y=32+imageHeight+8;
      const denominator=Math.round(capture.scale*(image.width/2)/(actualWidth/1000)/100)*100;
      pdf.setFontSize(10);pdf.text(`Scale approximately 1:${denominator.toLocaleString()} at ${sheet.paper.toUpperCase()} (${sheet.orientation})`,12,y);
      pdf.text("N",width-20,18);pdf.line(width-19,21,width-19,29);pdf.line(width-19,21,width-21,24);pdf.line(width-19,21,width-17,24);
      const [[south,west],[north,east]]=capture.bounds;
      const scaleKm=denominator*0.05/1000;
      pdf.line(12,y+4,62,y+4);pdf.line(12,y+2,12,y+6);pdf.line(62,y+2,62,y+6);
      pdf.setFontSize(8);pdf.text(`${scaleKm.toFixed(2)} km`,66,y+5);
      pdf.setFontSize(8);pdf.text(`Bounds: ${south.toFixed(5)}°, ${west.toFixed(5)}° — ${north.toFixed(5)}°, ${east.toFixed(5)}°`,12,y+12);
      pdf.text("Legend: green boundary = selected area; grid = WGS84 latitude / longitude.",12,y+19);
      if(sheet.overlay) pdf.text(`Image: ${sheet.overlay.name} · ${sheet.overlay.georeferenced ? "Georeferenced" : "Unreferenced / manually positioned"}`,12,y+26,{maxWidth:width-24});
      pdf.text("Terrain / contours are provider data where available; this is not a surveyed or certified map.",12,height-19);
      pdf.text(`Prepared ${new Date().toLocaleString()} · OSM contributors · OpenTopoMap CC-BY-SA / SRTM or Esri as shown`,12,height-12,{maxWidth:width-24});
      if(print) {
        pdf.autoPrint();const url=URL.createObjectURL(pdf.output("blob"));
        const opened=window.open(url,"_blank");
        if(!opened) { URL.revokeObjectURL(url);throw new Error("Allow pop-ups to open the print-ready PDF, or use Export PDF."); }
        setTimeout(()=>URL.revokeObjectURL(url),120000);
      } else pdf.save(`${(sheet.title || "selected-map").replace(/[^a-z0-9_-]/gi,"-")}-${sheet.paper}.pdf`);
    } catch(e) {toast.error(e instanceof Error ? e.message : "Map export failed.");} finally {setBusy(false);}
  }
  return <Dialog open={!!capture} onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-h-[90vh] max-w-4xl overflow-auto"><DialogHeader><DialogTitle>Map print preview · {sheet.paper.toUpperCase()} {sheet.orientation}</DialogTitle></DialogHeader>
    <div className="space-y-3 border bg-card p-4"><div className="flex justify-between gap-3"><h2 className="text-lg font-semibold break-words">{sheet.title || "Selected map area"}</h2><span className="text-center text-sm font-semibold">N<br/>↑</span></div>{capture && <img src={capture.url} alt="Selected geographic area print preview" className="max-h-[55vh] w-full object-contain" />}<p className="text-xs text-muted-foreground">WGS84 coordinates · green selection boundary · provider terrain/contours where available · north up</p></div>
    <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button variant="outline" disabled={busy} onClick={()=>output(false)}><Download className="mr-2 h-4 w-4"/>Export PDF</Button><Button disabled={busy} onClick={()=>output(true)}><Printer className="mr-2 h-4 w-4"/>Print map</Button></div>
  </DialogContent></Dialog>;
}