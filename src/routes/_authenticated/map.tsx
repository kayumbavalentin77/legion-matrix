import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const LocationMap = lazy(() => import("@/components/location-map"));

export const Route = createFileRoute("/_authenticated/map")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Location Map | Military Management System" },
      { name: "description", content: "Administrative map of approved unit, facility and checkpoint locations." },
      { property: "og:title", content: "Location Map | Military Management System" },
      { property: "og:description", content: "Administrative map of approved unit, facility and checkpoint locations." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const { data = [] } = useQuery({
    queryKey: ["locations", "map"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("id,name,category,latitude,longitude");
      return (data ?? []).filter((l) => l.latitude != null && l.longitude != null);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Location Map"
        description="Administrative reference map. Displays approved locations only."
      />
      <Card>
        <CardContent className="p-0">
          <Suspense fallback={<div className="grid h-[560px] place-items-center text-sm text-muted-foreground">Loading map…</div>}>
            <LocationMap
              points={data.map((l) => ({
                id: l.id as string,
                name: l.name as string,
                category: (l.category as string) ?? "Location",
                lat: Number(l.latitude),
                lng: Number(l.longitude),
              }))}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
