import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function DashboardLayout() {
  const { token, doctor, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b bg-card px-6 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-foreground">
                  {doctor?.clinic_name || 'My Clinic'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              </Button>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-accent transition-colors cursor-pointer"
                title="Go to Profile"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold leading-tight">
                    {doctor?.name || 'Doctor'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {doctor?.specialization || ''}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-full medical-gradient flex items-center justify-center text-primary-foreground text-xs font-bold shadow-md">
                  {(doctor?.name || 'DR').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              </button>
            </div>
          </header>
          <main className="flex-1 p-5 md:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
