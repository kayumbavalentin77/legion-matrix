import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  Boxes,
  Activity,
  Stethoscope,
  FileBarChart,
  ClipboardList,
  FolderOpen,
  Files,
  Map as MapIcon,
  Navigation,
  ShieldAlert,
  FolderLock,
  Gauge,
  Car,
  Wrench,
  MapPin,
  TriangleAlert,
  Crosshair,
  Package,
  Radio,
  Warehouse,
  Settings,
  ScrollText,
  Shield,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { RwandaFlag } from "@/components/rwanda-flag";
import { useAuthState, type Section } from "@/lib/auth";

type Item = { title: string; url: string; icon: typeof Users };
type Group = { label: string; sections?: Section[]; adminOnly?: boolean; items: Item[] };

const GROUPS: Group[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Reports", url: "/reports", icon: FileBarChart },
    ],
  },
  {
    label: "Administration",
    adminOnly: true,
    items: [
      { title: "Manage Users", url: "/users", icon: Users },
      { title: "Audit Log", url: "/audit-log", icon: ScrollText },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
  {
    label: "S1 · Personnel",
    sections: ["s1"],
    items: [
      { title: "Soldier Registry", url: "/soldiers", icon: UserSquare2 },
      { title: "Physical Fitness", url: "/fitness", icon: Activity },
      { title: "Medical Records", url: "/medical", icon: Stethoscope },
    ],
  },
  {
    label: "S1 · Equipment",
    sections: ["s1"],
    items: [
      { title: "Equipment Registry", url: "/equipment", icon: Boxes },
      { title: "Weapons Registry", url: "/weapons", icon: Crosshair },
      { title: "Ammunition", url: "/ammunition", icon: Package },
      { title: "Communications", url: "/communications", icon: Radio },
      { title: "General Inventory", url: "/inventory", icon: Warehouse },
    ],
  },
  {
    label: "S1 · Vehicles",
    sections: ["s1"],
    items: [
      { title: "Vehicle Registration", url: "/vehicles", icon: Car },
      { title: "Vehicle Status", url: "/vehicle-status", icon: Gauge },
      { title: "Maintenance", url: "/vehicle-maintenance", icon: Wrench },
      { title: "Vehicle Tracking", url: "/vehicle-tracking", icon: MapPin },
      { title: "Fault Reports", url: "/vehicle-faults", icon: TriangleAlert },
    ],
  },
  {
    label: "S2 · Intelligence",
    sections: ["s2"],
    items: [
      { title: "Security Reports", url: "/security-reports", icon: ShieldAlert },
      { title: "Intelligence Files", url: "/intelligence-files", icon: FolderLock },
      { title: "Threat Analysis", url: "/threat-analysis", icon: Gauge },
    ],
  },
  {
    label: "S3 · Operations",
    sections: ["s3"],
    items: [
      { title: "Operation Planning", url: "/operations", icon: ClipboardList },
      { title: "Mission Files", url: "/mission-files", icon: FolderOpen },
      { title: "Documents", url: "/documents", icon: Files },
      { title: "Mission Map", url: "/map", icon: MapIcon },
      { title: "GPS Coordinates", url: "/coordinates", icon: Navigation },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { can, isSuperAdmin } = useAuthState();

  const visible = GROUPS.filter((group) => {
    if (group.adminOnly) return isSuperAdmin;
    if (!group.sections) return true;
    return can(group.sections);
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex min-w-0 items-center gap-2.5 px-1 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.72rem] font-bold uppercase leading-tight tracking-[0.14em] text-sidebar-foreground">
                  Military
                </p>
                <p className="truncate text-[0.62rem] uppercase leading-tight tracking-[0.18em] text-sidebar-foreground/60">
                  Management System
                </p>
              </div>
              <RwandaFlag className="h-5 w-7" />
            </>
          ) : null}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {visible.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
