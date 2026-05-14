import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import AuthPage from "@/pages/auth";
import FeedPage from "@/pages/feed";
import ReelsPage from "@/pages/reels";
import MessagesPage from "@/pages/messages";
import ProfilePage from "@/pages/profile";
import GroupsPage from "@/pages/groups";
import MarketplacePage from "@/pages/marketplace";
import NotificationsPage from "@/pages/notifications";
import SearchPage from "@/pages/search";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import { getToken } from "@/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useGetMe();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl sjm-gradient flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div className="text-muted-foreground text-sm animate-pulse">Loading SJM...</div>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    if (location !== "/") return <Redirect to="/" />;
    return <>{children}</>;
  }

  if (location === "/") return <Redirect to="/feed" />;
  return <>{children}</>;
}

function Router() {
  return (
    <AuthGuard>
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/feed">
          <AppLayout><FeedPage /></AppLayout>
        </Route>
        <Route path="/reels">
          <AppLayout><ReelsPage /></AppLayout>
        </Route>
        <Route path="/messages">
          <AppLayout><MessagesPage /></AppLayout>
        </Route>
        <Route path="/messages/:id">
          <AppLayout><MessagesPage /></AppLayout>
        </Route>
        <Route path="/profile/:id">
          <AppLayout><ProfilePage /></AppLayout>
        </Route>
        <Route path="/groups">
          <AppLayout><GroupsPage /></AppLayout>
        </Route>
        <Route path="/marketplace">
          <AppLayout><MarketplacePage /></AppLayout>
        </Route>
        <Route path="/notifications">
          <AppLayout><NotificationsPage /></AppLayout>
        </Route>
        <Route path="/search">
          <AppLayout><SearchPage /></AppLayout>
        </Route>
        <Route path="/admin">
          <AppLayout><AdminPage /></AppLayout>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
