import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "s1" | "s2" | "s3" | "viewer";

export type Section = "s1" | "s2" | "s3";

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  s1: "S1 · Personnel & Equipment",
  s2: "S2 · Intelligence",
  s3: "S3 · Operations",
  viewer: "Unassigned",
};

export const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "s1", label: "S1 · Personnel & Equipment" },
  { value: "s2", label: "S2 · Intelligence" },
  { value: "s3", label: "S3 · Operations" },
  { value: "viewer", label: "Unassigned" },
];

export function useAuthState() {
  const qc = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      qc.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);
      return {
        user,
        profile,
        roles: (roles ?? []).map((r) => r.role as AppRole),
      };
    },
  });

  const roles = query.data?.roles ?? [];
  const isSuperAdmin = roles.includes("super_admin");
  const primaryRole: AppRole = isSuperAdmin ? "super_admin" : (roles[0] ?? "viewer");

  const can = (sections: Section[]) =>
    isSuperAdmin || sections.some((s) => roles.includes(s));

  return {
    ...query,
    user: query.data?.user ?? null,
    profile: query.data?.profile ?? null,
    roles,
    primaryRole,
    roleLabel: ROLE_LABELS[primaryRole] ?? "Unassigned",
    isSuperAdmin,
    isAdmin: isSuperAdmin,
    can,
    canWrite: isSuperAdmin || roles.some((r) => r !== "viewer"),
    canMedical: isSuperAdmin || roles.includes("s1"),
    isViewer: roles.length === 0 || (roles.length === 1 && roles[0] === "viewer"),
  };
}
