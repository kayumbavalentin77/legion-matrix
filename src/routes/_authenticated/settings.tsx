import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { updateOwnAccount } from "@/lib/account.functions";
import { useAuthState } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Military Management System" },
      { name: "description", content: "Account details, assigned roles and system information." },
      { property: "og:title", content: "Settings | Military Management System" },
      { property: "og:description", content: "Account details, assigned roles and system information." },
    ],
  }),
  component: SettingsPage,
});

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username may only contain letters, numbers, dot, dash or underscore"),
  email: z.string().trim().email("Enter a valid email address").max(255),
});

function SettingsPage() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuthState();
  const save = useServerFn(updateOwnAccount);
  const { data } = useQuery({
    queryKey: ["settings", "me"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("username, email").eq("id", user.id).maybeSingle(),
      ]);
      return {
        email: profile?.email ?? user.email ?? "",
        username: profile?.username ?? "",
        roles: (roles ?? []).map((r) => r.role as string),
      };
    },
  });

  const [form, setForm] = useState({ username: "", email: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setForm({ username: data.username, email: data.email });
  }, [data]);

  const onSave = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      await save({ data: parsed.data });
      await supabase.auth.refreshSession();
      await qc.invalidateQueries();
      toast.success("Account details updated.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Account information and assigned access level." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {isSuperAdmin ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="me-username">Username</Label>
                <Input id="me-username" className="mt-1.5" maxLength={60} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="me-email">Email</Label>
                <Input id="me-email" type="email" className="mt-1.5" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-2">
                <span className="text-muted-foreground">Username</span>
                <span className="font-medium">{data?.username || "—"}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{data?.email ?? "—"}</span>
              </div>
            </>
          )}
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-muted-foreground">Assigned roles</span>
            <span className="font-medium">{data?.roles.join(", ") || "Viewer"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
