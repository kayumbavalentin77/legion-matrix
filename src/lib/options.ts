import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUnitOptions() {
  const { data } = useQuery({
    queryKey: ["options", "units"],
    queryFn: async () => {
      const { data } = await supabase.from("units").select("id,name").order("name");
      return data ?? [];
    },
  });
  return (data ?? []).map((u) => ({ value: u.id, label: u.name }));
}

export function useSoldierOptions() {
  const { data } = useQuery({
    queryKey: ["options", "soldiers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("soldiers")
        .select("id,full_name,service_number")
        .order("full_name");
      return data ?? [];
    },
  });
  return (data ?? []).map((s) => ({ value: s.id, label: `${s.full_name} (${s.service_number})` }));
}

export function useVehicleOptions() {
  const { data } = useQuery({
    queryKey: ["options", "vehicles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id,registration_number,model")
        .order("registration_number");
      return data ?? [];
    },
  });
  return (data ?? []).map((v) => ({ value: v.id, label: `${v.registration_number} — ${v.model ?? ""}` }));
}

export const sel = (values: string[]) => values.map((v) => ({ value: v, label: v }));

export const RANKS = [
  "Private",
  "Corporal",
  "Sergeant",
  "Warrant Officer",
  "Lieutenant",
  "Captain",
  "Major",
  "Colonel",
];
