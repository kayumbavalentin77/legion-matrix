import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "administrator"
  | "personnel_officer"
  | "logistics_officer"
  | "medical_officer"
  | "vehicle_officer"
  | "equipment_officer"
  | "viewer";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  administrator: "Administrator",
  personnel_officer: "Personnel Officer",
  logistics_officer: "Logistics Officer",
  medical_officer: "Medical Officer",
  vehicle_officer: "Vehicle Officer",
  equipment_officer: "Equipment Officer",
  viewer: "Viewer",
};

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
  const isAdmin = roles.includes("super_admin") || roles.includes("administrator");

  return {
    ...query,
    user: query.data?.user ?? null,
    profile: query.data?.profile ?? null,
    roles,
    isAdmin,
    canWrite: roles.some((r) => r !== "viewer"),
    canMedical: isAdmin || roles.includes("medical_officer"),
    isViewer: roles.length === 0 || (roles.length === 1 && roles[0] === "viewer"),
  };
}
