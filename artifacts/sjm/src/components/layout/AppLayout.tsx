import { Link, useLocation } from "wouter";
import { useGetMe, useGetFeedSummary, useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { clearToken } from "@/lib/auth";
import {
  Home, Play, MessageCircle, Bell, Users, ShoppingBag, Search, Shield,
  LogOut, User, Menu, X, Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const navItems = [
  { href: "/feed", icon: Home, label: "Home" },
  { href: "/reels", icon: Play, label: "Reels" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/groups", icon: Users, label: "Groups" },
  { href: "/marketplace", icon: ShoppingBag, label: "Marketplace" },
  { href: "/search", icon: Search, label: "Search" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: me } = useGetMe();
  const { data: summary } = useGetFeedSummary();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  function handleLogout() {
    logout.mutate(undefined, {
      onSettled: () => {
        clearToken();
        queryClient.clear();
        window.location.href = import.meta.env.BASE_URL || "/";
      },
    });
  }

  function toggleDark() {
    document.documentElement.classList.toggle("dark");
    setDark(d => !d);
  }

  const unreadNotifs = summary?.unreadNotifications ?? 0;
  const unreadMessages = summary?.unreadMessages ?? 0;

  function getBadge(href: string) {
    if (href === "/notifications" && unreadNotifs > 0) return unreadNotifs;
    if (href === "/messages" && unreadMessages > 0) return unreadMessages;
    return null;
  }

  const sidebar = (
    <aside className="flex flex-col h-full w-64 border-r border-border bg-sidebar px-3 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-6">
        <div className="w-9 h-9 rounded-xl sjm-gradient flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <span className="font-bold text-xl tracking-tight text-foreground">SJM</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = location.startsWith(href);
          const badge = getBadge(href);
          return (
            <Link key={href} href={href}>
              <a
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative
                  ${active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
              >
                <Icon size={19} />
                <span>{label}</span>
                {badge !== null && (
                  <Badge className="ml-auto h-5 min-w-5 px-1.5 text-xs" variant={active ? "secondary" : "default"}>
                    {badge > 99 ? "99+" : badge}
                  </Badge>
                )}
              </a>
            </Link>
          );
        })}

        {me?.isAdmin && (
          <Link href="/admin">
            <a
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${location.startsWith("/admin")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
            >
              <Shield size={19} />
              <span>Admin</span>
            </a>
          </Link>
        )}
      </nav>

      {/* Bottom */}
      <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={toggleDark}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          <span>{dark ? "Light mode" : "Dark mode"}</span>
        </Button>

        {me && (
          <Link href={`/profile/${me.id}`}>
            <a className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-sidebar-accent transition-colors" onClick={() => setMobileOpen(false)}>
              <Avatar className="w-8 h-8">
                <AvatarImage src={me.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">{me.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">{me.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">@{me.username}</p>
              </div>
            </a>
          </Link>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 shrink-0 sticky top-0 h-screen">{sidebar}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 z-50">{sidebar}</div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-30 bg-sidebar/95 backdrop-blur border-b border-border flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg sjm-gradient flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg tracking-tight">SJM</span>
          </div>
          {me && (
            <Link href={`/profile/${me.id}`} className="ml-auto">
              <a>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={me.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">{me.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
              </a>
            </Link>
          )}
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
