import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, formatDate } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type StockItem = { id: string; item_code: string; name: string; quantity: number; unit_of_measure: string | null };

export function StockTxDialog({ item, type, onClose }: { item: StockItem | null; type: "Received" | "Issued"; onClose: () => void }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const n = Number(qty);
  const over = type === "Issued" && item && n > item.quantity;
  const preview = item && n > 0 ? (type === "Received" ? item.quantity + n : item.quantity - n) : null;

  const m = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("record_inventory_transaction", {
        _inventory_id: item!.id, _type: type, _quantity: n, _date: date, _remarks: remarks || "",
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: async (bal) => {
      await logAudit("CREATE", "Inventory", item!.item_code, `${type} ${n} ${item!.unit_of_measure ?? ""} of ${item!.name}; balance ${bal}`);
      toast.success(`${type === "Received" ? "Stock received" : "Stock issued"} — new balance ${bal}`);
      qc.invalidateQueries({ queryKey: ["table", "inventory"] });
      qc.invalidateQueries({ queryKey: ["stock-card", item!.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setQty(""); setRemarks("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "Received" ? "Add Received" : "Issue Stock"}</DialogTitle>
          <DialogDescription>{item?.item_code} · {item?.name} — current balance {item?.quantity} {item?.unit_of_measure}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Quantity ({item?.unit_of_measure ?? "units"})</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantity" />
            {over ? <p className="text-sm text-destructive">Cannot issue more than the available balance ({item?.quantity}).</p>
              : preview !== null ? <p className="text-sm text-muted-foreground">New balance: <strong>{preview}</strong></p> : null}
          </div>
          <div className="grid gap-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Remarks</Label><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!(n > 0) || !!over || m.isPending} onClick={() => m.mutate()}>{m.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Tx = { id: string; transaction_type: string; quantity: number; transaction_date: string; created_at: string; notes: string | null; performed_by: string | null; balance_after: number | null };

export function StockCardDialog({ item, onClose }: { item: StockItem | null; onClose: () => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["stock-card", item?.id],
    enabled: !!item,
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_transactions")
        .select("id,transaction_type,quantity,transaction_date,created_at,notes,performed_by,balance_after")
        .eq("inventory_id", item!.id).order("transaction_date").order("created_at");
      if (error) throw error;
      return data as Tx[];
    },
  });
  // Rebuild running balance: opening = current - sum(received) + sum(issued)
  const isIn = (t: string) => /receiv|in|add/i.test(t);
  const net = data.reduce((s, t) => s + (isIn(t.transaction_type) ? t.quantity : -t.quantity), 0);
  let bal = (item?.quantity ?? 0) - net;
  const opening = bal;
  const rows = data.map((t) => { bal += isIn(t.transaction_type) ? t.quantity : -t.quantity; return { ...t, bal }; });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Stock Card — {item?.name}</DialogTitle>
          <DialogDescription>{item?.item_code} · Unit: {item?.unit_of_measure ?? "—"} · Current balance: {item?.quantity}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Issued</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Remarks</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow><TableCell>—</TableCell><TableCell className="text-muted-foreground">Opening balance</TableCell><TableCell /><TableCell /><TableCell className="text-right font-medium">{opening}</TableCell><TableCell /></TableRow>
              {isLoading ? <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow> : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(r.transaction_date ?? r.created_at)}</TableCell>
                  <TableCell>{isIn(r.transaction_type) ? "Received" : "Issued"}{r.performed_by ? ` · ${r.performed_by}` : ""}</TableCell>
                  <TableCell className="text-right">{isIn(r.transaction_type) ? r.quantity : ""}</TableCell>
                  <TableCell className="text-right">{isIn(r.transaction_type) ? "" : r.quantity}</TableCell>
                  <TableCell className="text-right font-medium">{r.bal}</TableCell>
                  <TableCell>{r.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
