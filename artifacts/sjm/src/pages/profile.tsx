import { useState } from "react";
import { useRoute } from "wouter";
import { useGetMe, useGetUser, useListPosts, useFollowUser, useUnfollowUser, getGetUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus, MessageCircle, Edit3, Grid3X3, List, Image } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const userId = params?.id ?? "0";
  const userIdNum = parseInt(userId, 10);
  const { data: me } = useGetMe();
  const { data: user, isLoading } = useGetUser(userIdNum, { query: { enabled: !!userIdNum, queryKey: getGetUserQueryKey(userIdNum) } });
  const { data: posts } = useListPosts({ userId: userIdNum });
  const queryClient = useQueryClient();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const isMe = me?.id === user?.id;
  const isFollowing = (user as any)?.isFollowing;

  function handleFollowToggle() {
    if (!user) return;
    if (isFollowing) {
      unfollowUser.mutate({ id: user.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userIdNum) }),
      });
    } else {
      followUser.mutate({ id: user.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userIdNum) }),
      });
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-0">
        <Skeleton className="w-full h-48" />
        <div className="px-4 -mt-12 pb-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="mt-3 space-y-2">
            <Skeleton className="w-36 h-5" />
            <Skeleton className="w-24 h-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        User not found
      </div>
    );
  }

  const postList = posts ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cover */}
      <div className="relative">
        <div
          className="h-48 bg-gradient-to-br from-primary/30 to-purple-500/30"
          style={user.coverUrl ? { backgroundImage: `url(${user.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        />
        {/* Avatar */}
        <div className="absolute -bottom-12 left-4">
          <div className="p-1 bg-background rounded-full">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="text-3xl">{user.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">{user.fullName}</h1>
              {user.isVerified && (
                <div className="w-5 h-5 rounded-full sjm-gradient flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">✓</span>
                </div>
              )}
              {user.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
            </div>
            <p className="text-muted-foreground text-sm">@{user.username}</p>
            {user.bio && <p className="mt-2 text-sm leading-relaxed">{user.bio}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {isMe ? (
              <Button variant="outline" size="sm" className="gap-1.5">
                <Edit3 size={14} />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  className="gap-1.5"
                  onClick={handleFollowToggle}
                  disabled={followUser.isPending || unfollowUser.isPending}
                >
                  {isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MessageCircle size={14} />
                  Message
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          {[
            ["Posts", user.postsCount],
            ["Followers", user.followersCount],
            ["Following", user.followingCount],
          ].map(([label, count]) => (
            <div key={label as string} className="text-center">
              <div className="font-bold text-base">{(count as number).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="border-t border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="font-semibold text-sm">Posts</h2>
          <div className="flex items-center gap-1">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("grid")}>
              <Grid3X3 size={13} />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("list")}>
              <List size={13} />
            </Button>
          </div>
        </div>

        {postList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Image size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No posts yet</p>
            {isMe && <p className="text-sm">Share your first post!</p>}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-3 gap-0.5">
            {postList.map((post: any) => (
              <div key={post.id} className="aspect-square bg-muted relative overflow-hidden group cursor-pointer">
                {post.mediaUrls?.length > 0 ? (
                  <img src={post.mediaUrls[0]} alt="" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <p className="text-xs text-foreground text-center line-clamp-4">{post.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 space-y-3 pb-4">
            {postList.map((post: any) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <p className="text-sm">{post.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
