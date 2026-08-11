import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

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

function SettingsPage() {
  const { data } = useQuery({
    queryKey: ["settings", "me"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return { email: user.email ?? "", roles: (roles ?? []).map((r) => r.role as string) };
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Account information and assigned access level." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-2">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{data?.email ?? "—"}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-muted-foreground">Assigned roles</span>
            <span className="font-medium">{data?.roles.join(", ") || "Viewer"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
