import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  green: "border-transparent bg-primary/12 text-primary",
  amber: "border-transparent bg-chart-3/20 text-chart-3",
  red: "border-transparent bg-destructive/12 text-destructive",
  blue: "border-transparent bg-chart-2/15 text-chart-2",
  slate: "border-transparent bg-muted text-muted-foreground",
};

const MAP: Record<string, keyof typeof TONES> = {
  active: "green",
  operational: "green",
  available: "green",
  approved: "green",
  completed: "green",
  passed: "green",
  excellent: "green",
  serviceable: "green",
  closed: "slate",
  archived: "slate",
  retired: "slate",
  inactive: "slate",
  draft: "slate",
  reserved: "blue",
  issued: "blue",
  good: "blue",
  public: "blue",
  internal: "blue",
  "in progress": "amber",
  maintenance: "amber",
  "under maintenance": "amber",
  "under inspection": "amber",
  "under review": "amber",
  "pending approval": "amber",
  pending: "amber",
  "on leave": "amber",
  average: "amber",
  medium: "amber",
  confidential: "amber",
  open: "amber",
  low: "green",
  high: "red",
  critical: "red",
  damaged: "red",
  lost: "red",
  missing: "red",
  "out of service": "red",
  "needs improvement": "red",
  restricted: "red",
};

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const tone = MAP[value.toLowerCase()] ?? "slate";
  return (
    <Badge variant="outline" className={cn("font-medium", TONES[tone])}>
      {value}
    </Badge>
  );
}
