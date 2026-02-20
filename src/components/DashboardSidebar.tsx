import { Wand2, LayoutDashboard, LogOut, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DashboardSidebarProps {
  credits: number;
}

export default function DashboardSidebar({ credits }: DashboardSidebarProps) {
  const { signOut } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Wand2 className="h-5 w-5 text-primary" />
        </div>
        <span className="text-lg font-bold text-primary glow-text">Harmonizer</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5 text-sidebar-accent-foreground">
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </div>
      </nav>

      {/* Credits + Logout */}
      <div className="border-t border-sidebar-border px-4 py-4 space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-sidebar-foreground">
            <span className="text-primary font-bold">{credits}</span> credits left
          </span>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
