import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetMe, useGetUser, useListPosts, useFollowUser, useUnfollowUser,
  useUpdateUser, useCreateConversation,
  getGetUserQueryKey, getListConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, UserMinus, MessageCircle, Edit3, Grid3X3, List, Image, Camera, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  const updateUser = useUpdateUser();
  const createConversation = useCreateConversation();
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editCover, setEditCover] = useState("");
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isMe = me?.id === user?.id;
  const isFollowing = (user as any)?.isFollowing;

  function openEdit() {
    setEditName(user?.fullName ?? "");
    setEditBio(user?.bio ?? "");
    setEditAvatar(user?.avatarUrl ?? "");
    setEditCover(user?.coverUrl ?? "");
    setEditOpen(true);
  }

  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = e => resolve(e.target?.result as string);
      r.readAsDataURL(file);
    });
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await readFileAsDataURL(file);
    setEditAvatar(url);
    e.target.value = "";
  }

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await readFileAsDataURL(file);
    setEditCover(url);
    e.target.value = "";
  }

  function handleSaveEdit() {
    if (!user) return;
    updateUser.mutate(
      { id: user.id, data: { fullName: editName, bio: editBio, avatarUrl: editAvatar || undefined, coverUrl: editCover || undefined } },
      {
        onSuccess: () => {
          setEditOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userIdNum) });
          toast({ title: "Profile updated!" });
        },
        onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
      }
    );
  }

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

  function handleMessage() {
    if (!user) return;
    createConversation.mutate(
      { data: { participantIds: [user.id], isGroup: false } },
      {
        onSuccess: (conv: any) => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          navigate(`/messages/${conv.id}`);
        },
        onError: () => toast({ title: "Could not open conversation", variant: "destructive" }),
      }
    );
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
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        User not found
      </div>
    );
  }

  const postList = posts ?? [];

  return (
    <>
      <div className="max-w-2xl mx-auto">
        {/* Cover */}
        <div className="relative">
          <div
            className="h-48 bg-gradient-to-br from-primary/30 to-purple-500/30"
            style={user.coverUrl ? { backgroundImage: `url(${user.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
          />
          {isMe && (
            <button
              className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
              onClick={openEdit}
            >
              <Camera size={13} />
              Edit cover
            </button>
          )}
          {/* Avatar */}
          <div className="absolute -bottom-12 left-4">
            <div className="p-1 bg-background rounded-full relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="text-3xl">{user.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              {isMe && (
                <button
                  className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
                  onClick={openEdit}
                >
                  <Camera size={12} />
                </button>
              )}
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
                <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
                  <Edit3 size={14} />
                  Edit Profile
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleMessage}
                    disabled={createConversation.isPending}
                  >
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
                    {post.mediaUrls?.length > 0 && (
                      <img src={post.mediaUrls[0]} alt="" className="mt-2 rounded-lg max-h-48 object-cover w-full" />
                    )}
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

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={editAvatar || undefined} />
                  <AvatarFallback className="text-2xl">{editName.charAt(0)}</AvatarFallback>
                </Avatar>
                <button
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white"
                  onClick={() => avatarFileRef.current?.click()}
                >
                  <Camera size={11} />
                </button>
                <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Profile photo</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Or paste image URL"
                    className="h-8 text-xs"
                    value={editAvatar}
                    onChange={e => setEditAvatar(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Cover photo */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Cover photo</Label>
              <div
                className="h-20 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 relative overflow-hidden cursor-pointer border border-border"
                style={editCover ? { backgroundImage: `url(${editCover})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
                onClick={() => coverFileRef.current?.click()}
              >
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                  <div className="flex items-center gap-1.5 text-white text-xs font-medium">
                    <Upload size={14} />
                    Upload cover
                  </div>
                </div>
                <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
              </div>
              <Input
                placeholder="Or paste cover image URL"
                className="h-8 text-xs"
                value={editCover}
                onChange={e => setEditCover(e.target.value)}
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-sm font-medium">Full name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-bio" className="text-sm font-medium">Bio</Label>
              <Textarea
                id="edit-bio"
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                placeholder="Write a short bio..."
                className="resize-none h-20 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
