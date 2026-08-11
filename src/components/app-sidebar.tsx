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
import { useAuthState } from "@/lib/auth";

type Item = { title: string; url: string; icon: typeof Users; medical?: boolean };

const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Admin",
    items: [
      { title: "Manage Users", url: "/users", icon: Users },
      { title: "Soldier Registry", url: "/soldiers", icon: UserSquare2 },
      { title: "Equipment Registry", url: "/equipment", icon: Boxes },
      { title: "Physical Fitness", url: "/fitness", icon: Activity },
      { title: "Medical Records", url: "/medical", icon: Stethoscope, medical: true },
      { title: "Reports", url: "/reports", icon: FileBarChart },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Operation Planning", url: "/operations", icon: ClipboardList },
      { title: "Mission Files", url: "/mission-files", icon: FolderOpen },
      { title: "Documents", url: "/documents", icon: Files },
      { title: "Mission Map", url: "/map", icon: MapIcon },
      { title: "GPS Coordinates", url: "/coordinates", icon: Navigation },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Security Reports", url: "/security-reports", icon: ShieldAlert },
      { title: "Intelligence Files", url: "/intelligence-files", icon: FolderLock },
      { title: "Threat Analysis", url: "/threat-analysis", icon: Gauge },
    ],
  },
  {
    label: "Vehicles",
    items: [
      { title: "Vehicle Registration", url: "/vehicles", icon: Car },
      { title: "Vehicle Status", url: "/vehicle-status", icon: Gauge },
      { title: "Maintenance", url: "/vehicle-maintenance", icon: Wrench },
      { title: "Vehicle Tracking", url: "/vehicle-tracking", icon: MapPin },
      { title: "Fault Reports", url: "/vehicle-faults", icon: TriangleAlert },
    ],
  },
  {
    label: "Equipment",
    items: [
      { title: "Weapons Registry", url: "/weapons", icon: Crosshair },
      { title: "Ammunition Inventory", url: "/ammunition", icon: Package },
      { title: "Communication Equipment", url: "/communications", icon: Radio },
      { title: "General Inventory", url: "/inventory", icon: Warehouse },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Audit Log", url: "/audit-log", icon: ScrollText },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { canMedical } = useAuthState();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex min-w-0 items-center gap-2.5 px-1 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[0.72rem] font-bold uppercase leading-tight tracking-[0.14em] text-sidebar-foreground">
                Military
              </p>
              <p className="truncate text-[0.62rem] uppercase leading-tight tracking-[0.18em] text-sidebar-foreground/60">
                Management System
              </p>
            </div>
          ) : null}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                  .filter((item) => !item.medical || canMedical)
                  .map((item) => (
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
