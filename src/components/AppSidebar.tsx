import { NavLink, useLocation } from "react-router-dom";
import { ListChecks, Grid3x3, History, ShieldAlert, Target, Lightbulb, LayoutDashboard, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRiskAccess } from "@/hooks/useRiskAccess";

const items = [
  { title: "Dashboard", url: "/risk/dashboard", icon: LayoutDashboard },
  { title: "Risk Register", url: "/risk/register", icon: ListChecks },
  { title: "BE SMART Actions", url: "/risk/actions", icon: Target },
  { title: "Quality Improvement", url: "/risk/qi", icon: Lightbulb },
  { title: "Risk Matrix & Guidance", url: "/risk/matrix", icon: Grid3x3 },
  { title: "Audit Log", url: "/risk/audit", icon: History },
  { title: "Settings", url: "/risk/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { hasRiskAccess } = useRiskAccess();

  if (!hasRiskAccess) {
    return (
      <Sidebar collapsible="icon">
        <SidebarContent />
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-brand" />
            {!collapsed && <span>Risk Guard</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
