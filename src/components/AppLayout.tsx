import { Outlet, Navigate } from "react-router-dom";
import { ShieldAlert, LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRiskAccess } from "@/hooks/useRiskAccess";

export default function AppLayout() {
  const { user, signOut } = useAuth();
  // Auth temporarily disabled — allow access without a session.
  const accessLoading = false;
  const hasRiskAccess = true;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-brand text-brand-foreground px-3 shadow-sm">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-brand-foreground hover:bg-brand-dark" />
              <ShieldAlert className="h-5 w-5" />
              <h1 className="text-base font-semibold tracking-tight">Hockey Risk Guard</h1>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden sm:inline opacity-90">{user?.email ?? "Guest (auth disabled)"}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-brand-foreground hover:bg-brand-dark hover:text-brand-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {accessLoading ? (
              <div className="p-8 text-muted-foreground">Checking access…</div>
            ) : !hasRiskAccess ? (
              <PendingAccess />
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{children}</div>;
}

function PendingAccess() {
  const { signOut } = useAuth();
  return (
    <div className="max-w-xl mx-auto mt-24 p-8 rounded-lg border bg-card text-card-foreground text-center">
      <ShieldAlert className="h-10 w-10 text-brand mx-auto mb-3" />
      <h2 className="text-lg font-semibold mb-2">Pending Risk Management access</h2>
      <p className="text-sm text-muted-foreground">
        Your account doesn't currently have Risk Management access. Please contact your association
        administrator to be granted the President, Committee or Super Admin role.
      </p>
      <Button variant="outline" className="mt-4" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
