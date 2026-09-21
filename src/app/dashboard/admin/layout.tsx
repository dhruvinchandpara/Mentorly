'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  Users,
  GraduationCap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Loader2,
  UserCog,
  Settings,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  {
    label: 'Home',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Approvals',
    href: '/dashboard/admin/approvals',
    icon: ClipboardCheck,
  },
  {
    label: 'Sessions',
    href: '/dashboard/admin/sessions',
    icon: CalendarDays,
  },
  {
    label: 'Mentors',
    href: '/dashboard/admin/mentors',
    icon: Users,
  },
  {
    label: 'Students',
    href: '/dashboard/admin/students',
    icon: GraduationCap,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut, supabase } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [approvalsCount, setApprovalsCount] = useState(0);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    let cancelled = false;

    const fetchApprovalsCount = async () => {
      const [{ count: pendingCount }, { count: reviewCount }] = await Promise.all([
        supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'requested']),
        supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'awaiting_post_review'),
      ]);
      if (!cancelled) {
        setApprovalsCount((pendingCount || 0) + (reviewCount || 0));
      }
    };

    fetchApprovalsCount();
    return () => {
      cancelled = true;
    };
  }, [profile, supabase]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (profile && profile.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, profile, loading, router]);

  if (loading || !profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Verifying admin access...</h2>
        </div>
      </div>
    );
  }

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AD';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-20' : 'w-64'
        } transition-all duration-300 ease-in-out bg-card border-r border-border flex flex-col fixed h-full z-20`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          {!collapsed && (
            <Link href="/dashboard/admin" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0F1919] to-[#702327] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-semibold text-foreground tracking-tight">Mentorly Admin</span>
            </Link>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0F1919] to-[#702327] flex items-center justify-center mx-auto">
              <Shield className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-secondary text-[var(--fg-faint)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-center p-3 rounded-lg hover:bg-secondary text-muted-foreground transition-colors mb-2"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#F5E6DE] text-[#702327] font-medium'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#702327]' : 'text-[var(--fg-faint)]'}`} />
                {!collapsed && (
                  <span className="text-sm flex items-center flex-1 gap-2">
                    {item.label}
                    {item.href === '/dashboard/admin/approvals' && approvalsCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#FBF7D9] text-[#0F1919] text-[10px] font-semibold border border-[#0F1919]/10">
                        {approvalsCount}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-border">
          {!collapsed ? (
            <div className="px-3 py-2">
              <p className="text-xs text-[var(--fg-faint)]">Admin Panel v1.0</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-success" />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/dashboard/admin"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Admin
            </Link>
            {pathname !== '/dashboard/admin' && (
              <>
                <span className="text-[var(--fg-faint)]">/</span>
                <span className="text-foreground font-medium">
                  {pathname
                    .split('/')
                    .pop()
                    ?.replace(/-/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </>
            )}
          </div>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 hover:bg-secondary rounded-lg px-3 py-2 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-[#F5E6DE]">
                <AvatarFallback className="bg-gradient-to-br from-[#0F1919] to-[#702327] text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push('/dashboard/admin/profile')}>
                <Settings className="mr-2 h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/admin/manage-admins')}>
                <UserCog className="mr-2 h-4 w-4" />
                Manage Admins
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
