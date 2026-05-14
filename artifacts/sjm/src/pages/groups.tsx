import { useState } from "react";
import { useListGroups, useCreateGroup, useJoinGroup, getListGroupsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Lock, Globe, Search } from "lucide-react";
import { useForm } from "react-hook-form";

export default function GroupsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: groups, isLoading } = useListGroups({ search: search || undefined });
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();

  const form = useForm({ defaultValues: { name: "", description: "", isPrivate: false } });

  function handleCreate(data: any) {
    createGroup.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Group created!" });
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
      },
      onError: () => toast({ title: "Failed to create group", variant: "destructive" }),
    });
  }

  function handleJoin(id: number) {
    joinGroup.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Joined group!" });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
      },
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Discover communities that match your interests</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} />Create Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new group</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Group name</Label>
                <Input placeholder="e.g. Photography Lovers" {...form.register("name", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input placeholder="What's this group about?" {...form.register("description")} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="private" {...form.register("isPrivate")} className="w-4 h-4" />
                <Label htmlFor="private">Private group</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createGroup.isPending}>
                {createGroup.isPending ? "Creating..." : "Create Group"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 space-y-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-1/2 h-3" />
            </CardContent></Card>
          ))}
        </div>
      ) : (groups ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No groups found</p>
          {search && <p className="text-sm">Try a different search term</p>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(groups ?? []).map((group: any) => (
            <Card key={group.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-24 bg-gradient-to-br from-primary/20 to-purple-500/20">
                {group.avatarUrl && (
                  <img src={group.avatarUrl} alt="" className="w-full h-full object-cover opacity-60" />
                )}
              </div>
              <CardContent className="p-4 -mt-6">
                <Avatar className="w-12 h-12 ring-2 ring-background mb-2">
                  <AvatarImage src={group.avatarUrl} />
                  <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{group.name}</h3>
                    {group.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
                    )}
                  </div>
                  {group.isPrivate ? (
                    <Lock size={14} className="shrink-0 text-muted-foreground mt-0.5" />
                  ) : (
                    <Globe size={14} className="shrink-0 text-muted-foreground mt-0.5" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    <Users size={12} className="inline mr-1" />
                    {group.membersCount.toLocaleString()} members
                  </span>
                  {group.isMember ? (
                    <Badge variant="secondary" className="text-xs">Member</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleJoin(group.id)}>
                      Join
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
