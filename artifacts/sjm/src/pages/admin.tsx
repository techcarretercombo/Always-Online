import { useState } from "react";
import { useGetPlatformStats, useAdminListUsers, useBanUser, useListReports, useAdminDeletePost, getAdminListUsersQueryKey, getListReportsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { Shield, Users, FileText, Flag, TrendingUp, Ban, Trash2, Activity, UserCheck, ShoppingBag } from "lucide-react";
import { Redirect } from "wouter";

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Shield; label: string; value: number | string; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BanDialog({ user, onBan }: { user: any; onBan: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm({ defaultValues: { reason: "" } });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-1.5 h-7" disabled={user.isBanned}>
          <Ban size={12} />
          {user.isBanned ? "Banned" : "Ban"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ban @{user.username}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(data => { onBan(data.reason); setOpen(false); })} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input placeholder="Reason for banning..." {...form.register("reason", { required: true })} />
          </div>
          <Button type="submit" variant="destructive" className="w-full">Confirm Ban</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const { data: me } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetPlatformStats();
  const { data: users, isLoading: usersLoading } = useAdminListUsers({});
  const { data: reports, isLoading: reportsLoading } = useListReports();
  const banUser = useBanUser();
  const deletePost = useAdminDeletePost();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!me?.isAdmin) {
    return <Redirect to="/feed" />;
  }

  function handleBan(userId: number, reason: string) {
    banUser.mutate({ id: userId, data: { reason } }, {
      onSuccess: () => {
        toast({ title: "User banned" });
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
      },
      onError: () => toast({ title: "Failed to ban user", variant: "destructive" }),
    });
  }

  function handleDeletePost(postId: number) {
    deletePost.mutate({ id: postId }, {
      onSuccess: () => {
        toast({ title: "Post deleted" });
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
      },
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Shield size={20} className="text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Platform management and moderation</p>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : stats && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="bg-blue-500" />
          <StatCard icon={FileText} label="Total Posts" value={stats.totalPosts} color="bg-green-500" />
          <StatCard icon={Activity} label="Reels" value={stats.totalReels} color="bg-purple-500" />
          <StatCard icon={Users} label="Groups" value={stats.totalGroups} color="bg-orange-500" />
          <StatCard icon={UserCheck} label="Active Today" value={stats.activeToday} color="bg-teal-500" />
          <StatCard icon={Ban} label="Banned Users" value={stats.bannedUsers} color="bg-red-500" />
          <StatCard icon={Flag} label="Pending Reports" value={stats.reportsPending ?? 0} color="bg-yellow-500" />
          <StatCard icon={TrendingUp} label="Trending" value="Live" color="bg-pink-500" />
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {usersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-semibold p-4 text-muted-foreground">User</th>
                        <th className="text-left font-semibold p-4 text-muted-foreground">Email</th>
                        <th className="text-left font-semibold p-4 text-muted-foreground">Status</th>
                        <th className="text-left font-semibold p-4 text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(users ?? []).map((user: any) => (
                        <tr key={user.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback className="text-xs">{user.fullName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium truncate max-w-[120px]">{user.fullName}</div>
                                <div className="text-xs text-muted-foreground">@{user.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">{user.email}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {user.isAdmin && <Badge variant="default" className="text-xs">Admin</Badge>}
                              {user.isVerified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                              {user.isBanned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                              {!user.isAdmin && !user.isVerified && !user.isBanned && <Badge variant="outline" className="text-xs">Active</Badge>}
                            </div>
                          </td>
                          <td className="p-4">
                            {!user.isAdmin && (
                              <BanDialog user={user} onBan={(reason) => handleBan(user.id, reason)} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(users ?? []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">No users found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports">
          {reportsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (reports ?? []).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Flag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No reports</p>
              <p className="text-sm">The platform looks clean!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(reports ?? []).map((report: any) => (
                <Card key={report.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={report.reporter?.avatarUrl} />
                            <AvatarFallback className="text-xs">{report.reporter?.fullName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{report.reporter?.fullName}</span>
                          <span className="text-muted-foreground text-xs">reported a {report.entityType}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{report.reason}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={report.status === "pending" ? "destructive" : "secondary"} className="text-xs capitalize">
                          {report.status}
                        </Badge>
                        {report.entityType === "post" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1.5 h-7"
                            onClick={() => handleDeletePost(report.entityId)}
                          >
                            <Trash2 size={12} />
                            Delete Post
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
