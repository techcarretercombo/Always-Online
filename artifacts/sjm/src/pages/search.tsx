import { useState } from "react";
import { useGlobalSearch, getGlobalSearchQueryKey, useFollowUser, GlobalSearchType } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Users, FileText, Play, ShoppingBag, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [tab, setTab] = useState("all");
  const { toast } = useToast();
  const followUser = useFollowUser();

  const searchParams = { q: debouncedQ, type: tab === "all" ? undefined : (tab as typeof GlobalSearchType[keyof typeof GlobalSearchType]) };
  const { data: results, isLoading } = useGlobalSearch(
    searchParams,
    { query: { enabled: debouncedQ.length >= 2, queryKey: getGlobalSearchQueryKey(searchParams) } }
  );

  let debounceTimer: ReturnType<typeof setTimeout>;
  function handleSearch(val: string) {
    setQuery(val);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => setDebouncedQ(val), 400);
  }

  function handleFollow(id: number) {
    followUser.mutate({ id }, {
      onSuccess: () => toast({ title: "Followed!" }),
    });
  }

  const empty = !results || (results.total === 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Search</h1>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search people, posts, groups, reels..."
          className="pl-11 h-11 text-base"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          autoFocus
        />
      </div>

      {!debouncedQ || debouncedQ.length < 2 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Search SJM</p>
          <p className="text-sm">Type at least 2 characters to search</p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All {results?.total ? `(${results.total})` : ""}</TabsTrigger>
            <TabsTrigger value="users">People</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
            <TabsTrigger value="products">Market</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-20 h-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : empty ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">No results for "{debouncedQ}"</p>
              <p className="text-sm">Try different keywords</p>
            </div>
          ) : (
            <>
              {/* Users */}
              {(results?.users?.length ?? 0) > 0 && (
                <div className="mb-5">
                  {tab === "all" && <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Users size={14} />People</h3>}
                  <div className="space-y-1">
                    {(results?.users ?? []).map((user: any) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                        <Link href={`/profile/${user.id}`}>
                          <a>
                            <Avatar className="w-11 h-11">
                              <AvatarImage src={user.avatarUrl} />
                              <AvatarFallback>{user.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </a>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/profile/${user.id}`}>
                              <a className="font-semibold text-sm hover:underline">{user.fullName}</a>
                            </Link>
                            {user.isVerified && <div className="w-4 h-4 rounded-full sjm-gradient flex items-center justify-center"><span className="text-white text-[9px]">✓</span></div>}
                          </div>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => handleFollow(user.id)}>
                          <UserPlus size={12} />Follow
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts */}
              {(results?.posts?.length ?? 0) > 0 && (
                <div className="mb-5">
                  {tab === "all" && <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><FileText size={14} />Posts</h3>}
                  <div className="space-y-2">
                    {(results?.posts ?? []).map((post: any) => (
                      <Card key={post.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={post.author?.avatarUrl} />
                              <AvatarFallback className="text-xs">{post.author?.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-xs">{post.author?.fullName}</span>
                          </div>
                          <p className="text-sm line-clamp-2">{post.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Groups */}
              {(results?.groups?.length ?? 0) > 0 && (
                <div className="mb-5">
                  {tab === "all" && <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Users size={14} />Groups</h3>}
                  <div className="space-y-1">
                    {(results?.groups ?? []).map((group: any) => (
                      <div key={group.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={group.avatarUrl} />
                          <AvatarFallback>{group.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.membersCount} members</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{group.isPrivate ? "Private" : "Public"}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reels */}
              {(results?.reels?.length ?? 0) > 0 && (
                <div className="mb-5">
                  {tab === "all" && <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Play size={14} />Reels</h3>}
                  <div className="grid grid-cols-2 gap-2">
                    {(results?.reels ?? []).map((reel: any) => (
                      <Card key={reel.id} className="overflow-hidden">
                        <div className="aspect-video bg-muted relative">
                          {reel.thumbnailUrl ? (
                            <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Play size={24} className="text-muted-foreground/30" /></div>
                          )}
                        </div>
                        <CardContent className="p-2">
                          <p className="text-xs truncate">{reel.caption || "Reel"}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {(results?.products?.length ?? 0) > 0 && (
                <div className="mb-5">
                  {tab === "all" && <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><ShoppingBag size={14} />Marketplace</h3>}
                  <div className="grid grid-cols-2 gap-2">
                    {(results?.products ?? []).map((product: any) => (
                      <Card key={product.id} className="overflow-hidden">
                        <div className="aspect-square bg-muted">
                          {product.imageUrls?.[0] ? (
                            <img src={product.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={24} className="text-muted-foreground/30" /></div>
                          )}
                        </div>
                        <CardContent className="p-2">
                          <p className="text-xs font-medium truncate">{product.title}</p>
                          <p className="text-sm font-bold text-primary">${parseFloat(product.price).toFixed(2)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Tabs>
      )}
    </div>
  );
}
