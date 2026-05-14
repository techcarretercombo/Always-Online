import { useState } from "react";
import { useGetMe, useListPosts, useListStories, useCreatePost, useGetFeedSummary, useLikePost, useCreateStory, getListPostsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, MessageCircle, Share2, Image, Video, Smile,
  Plus, ThumbsUp, Laugh, Eye, Frown, Angry, HeartHandshake,
  MoreHorizontal, Bookmark
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const REACTIONS = [
  { id: "like", icon: ThumbsUp, label: "Like", color: "text-blue-500" },
  { id: "love", icon: Heart, label: "Love", color: "text-rose-500" },
  { id: "haha", icon: Laugh, label: "Haha", color: "text-yellow-500" },
  { id: "wow", icon: Eye, label: "Wow", color: "text-orange-500" },
  { id: "sad", icon: Frown, label: "Sad", color: "text-indigo-400" },
  { id: "angry", icon: Angry, label: "Angry", color: "text-red-600" },
];

function StoryCard({ story }: { story: any }) {
  return (
    <div className="relative shrink-0 w-24 h-36 rounded-2xl overflow-hidden cursor-pointer group">
      {story.mediaUrl ? (
        <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white text-sm font-medium"
          style={{ backgroundColor: story.backgroundColor || "#6366f1" }}>
          {story.textContent?.slice(0, 20)}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
      <div className="absolute top-2 left-2">
        <div className={`w-8 h-8 rounded-full p-0.5 ${story.isViewed ? "bg-muted" : "story-ring"}`}>
          <Avatar className="w-full h-full">
            <AvatarImage src={story.author?.avatarUrl} />
            <AvatarFallback className="text-xs">{story.author?.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="absolute bottom-2 left-0 right-0 px-1.5 text-center">
        <span className="text-white text-[10px] font-medium truncate block">{story.author?.fullName?.split(" ")[0]}</span>
      </div>
    </div>
  );
}

function CreateStoryCard({ me }: { me: any }) {
  return (
    <div className="relative shrink-0 w-24 h-36 rounded-2xl overflow-hidden cursor-pointer bg-muted group">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        <Avatar className="w-12 h-12 ring-2 ring-background">
          <AvatarImage src={me?.avatarUrl} />
          <AvatarFallback className="text-sm">{me?.fullName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="w-7 h-7 rounded-full sjm-gradient flex items-center justify-center -mt-5 ring-2 ring-background">
          <Plus size={14} className="text-white" />
        </div>
        <span className="text-[10px] font-medium text-foreground mt-1">Add story</span>
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="w-28 h-3.5" />
            <Skeleton className="w-16 h-3" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full h-4 mb-2" />
        <Skeleton className="w-3/4 h-4" />
      </CardContent>
    </Card>
  );
}

function PostCard({ post, me }: { post: any; me: any }) {
  const [showReactions, setShowReactions] = useState(false);
  const likePost = useLikePost();
  const queryClient = useQueryClient();

  function handleReaction(reaction: string) {
    likePost.mutate({ id: post.id, data: { reaction: reaction as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      },
    });
    setShowReactions(false);
  }

  const reactionObj = REACTIONS.find(r => r.id === post.userReaction);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <Link href={`/profile/${post.author?.id}`}>
            <a>
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={post.author?.avatarUrl} />
                <AvatarFallback>{post.author?.fullName?.charAt(0)}</AvatarFallback>
              </Avatar>
            </a>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/profile/${post.author?.id}`}>
                <a className="font-semibold text-sm hover:underline">{post.author?.fullName}</a>
              </Link>
              {post.author?.isVerified && (
                <div className="w-4 h-4 rounded-full sjm-gradient flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">✓</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>@{post.author?.username}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground h-8 w-8">
            <MoreHorizontal size={16} />
          </Button>
        </div>

        {/* Content */}
        {post.content && (
          <div className="px-4 pb-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{post.content}</div>
        )}

        {/* Hashtags */}
        {post.hashtags?.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {post.hashtags.map((tag: string) => (
              <span key={tag} className="text-xs text-primary font-medium">#{tag}</span>
            ))}
          </div>
        )}

        {/* Media */}
        {post.mediaUrls?.length > 0 && (
          <div className={`${post.mediaUrls.length === 1 ? "" : "grid grid-cols-2 gap-0.5"}`}>
            {post.mediaUrls.slice(0, 4).map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="w-full object-cover max-h-80" />
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="px-4 pt-2 pb-1 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {post.likesCount > 0 && (
              <>
                <div className="flex items-center -space-x-0.5">
                  {["like", "love", "haha"].slice(0, 3).map(r => {
                    const rx = REACTIONS.find(rx => rx.id === r);
                    return rx ? <rx.icon key={r} size={12} className={rx.color} /> : null;
                  })}
                </div>
                <span>{post.likesCount.toLocaleString()}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {post.commentsCount > 0 && <span>{post.commentsCount} comments</span>}
            {post.sharesCount > 0 && <span>{post.sharesCount} shares</span>}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center px-2 py-1">
          <div
            className="relative flex-1"
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            <Button
              variant="ghost"
              size="sm"
              className={`w-full gap-1.5 text-xs font-medium ${post.isLiked ? (reactionObj?.color ?? "text-blue-500") : "text-muted-foreground"}`}
              onClick={() => handleReaction(post.userReaction || "like")}
            >
              {reactionObj ? <reactionObj.icon size={16} className={reactionObj.color} /> : <ThumbsUp size={16} />}
              {reactionObj ? reactionObj.label : "Like"}
            </Button>

            {showReactions && (
              <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-2xl shadow-lg flex items-center gap-1 px-2 py-1.5 z-10">
                {REACTIONS.map(rx => (
                  <button
                    key={rx.id}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-accent transition-all hover:scale-125"
                    onClick={() => handleReaction(rx.id)}
                  >
                    <rx.icon size={20} className={rx.color} />
                    <span className="text-[9px] text-muted-foreground">{rx.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageCircle size={16} />
            Comment
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs font-medium text-muted-foreground">
            <Share2 size={16} />
            Share
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <Bookmark size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeedPage() {
  const { data: me } = useGetMe();
  const { data: posts, isLoading: postsLoading } = useListPosts({});
  const { data: stories } = useListStories({});
  const createPost = useCreatePost();
  const queryClient = useQueryClient();
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const { toast } = useToast();

  function handlePost() {
    if (!postText.trim()) return;
    createPost.mutate({ data: { type: "text", content: postText.trim(), audience: "public" } }, {
      onSuccess: () => {
        setPostText("");
        setPosting(false);
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        toast({ title: "Post shared!" });
      },
      onError: () => toast({ title: "Failed to post", variant: "destructive" }),
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Stories */}
      <div>
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-1">
          <CreateStoryCard me={me} />
          {(stories ?? []).map((story: any) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </div>

      {/* Composer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 shrink-0 mt-0.5">
              <AvatarImage src={me?.avatarUrl ?? undefined} />
              <AvatarFallback>{me?.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              {posting ? (
                <>
                  <Textarea
                    placeholder="What's on your mind?"
                    className="resize-none min-h-20 text-sm"
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Image size={16} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Video size={16} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Smile size={16} /></Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setPosting(false)}>Cancel</Button>
                      <Button size="sm" onClick={handlePost} disabled={!postText.trim() || createPost.isPending}>
                        Post
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <button
                  className="w-full text-left px-4 py-2.5 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
                  onClick={() => setPosting(true)}
                >
                  What's on your mind, {me?.fullName?.split(" ")[0]}?
                </button>
              )}
            </div>
          </div>
          {!posting && (
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground" onClick={() => setPosting(true)}>
                <Image size={16} className="text-green-500" />
                Photo/Video
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground" onClick={() => setPosting(true)}>
                <Smile size={16} className="text-yellow-500" />
                Feeling
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Posts */}
      {postsLoading ? (
        Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
      ) : (posts ?? []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No posts yet</p>
          <p className="text-sm">Be the first to share something!</p>
        </div>
      ) : (
        (posts ?? []).map((post: any) => (
          <PostCard key={post.id} post={post} me={me} />
        ))
      )}
    </div>
  );
}
