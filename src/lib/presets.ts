import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export type PresetConfig = {
  query: string;
  filters: Record<string, string>;
};

export type Preset = {
  id: string;
  module: string;
  name: string;
  config: PresetConfig;
};

/** Saved search + filter presets, scoped to the signed-in user by row-level security. */
export function usePresets(module: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["search-presets", module],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_presets")
        .select("id, module, name, config")
        .eq("module", module)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Preset[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["search-presets", module] });

  const save = useMutation({
    mutationFn: async (vars: { name: string; config: PresetConfig }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("You must be signed in to save a preset.");
      const { error } = await supabase.from("search_presets").upsert(
        {
          user_id: userData.user.id,
          module,
          name: vars.name.trim(),
          config: vars.config as unknown as never,
        },
        { onConflict: "user_id,module,name" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preset saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not save the preset"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("search_presets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preset removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not remove the preset"),
  });

  return { presets: list.data ?? [], isLoading: list.isLoading, save, remove };
}
