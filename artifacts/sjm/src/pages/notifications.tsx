import { useListNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCheck, Heart, MessageCircle, UserPlus, AtSign, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const NOTIF_ICONS: Record<string, { icon: typeof Bell; color: string }> = {
  like: { icon: Heart, color: "text-rose-500" },
  comment: { icon: MessageCircle, color: "text-blue-500" },
  follow: { icon: UserPlus, color: "text-green-500" },
  message: { icon: MessageCircle, color: "text-purple-500" },
  mention: { icon: AtSign, color: "text-orange-500" },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useListNotifications({});
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  function handleMarkAll() {
    markAll.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    });
  }

  function handleMarkOne(id: number) {
    markOne.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    });
  }

  const unread = (notifications ?? []).filter((n: any) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Notifications
            {unread > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 text-xs">{unread > 99 ? "99+" : unread}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Stay up to date with your activity</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleMarkAll} disabled={markAll.isPending}>
            <CheckCheck size={14} />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl">
              <Skeleton className="w-11 h-11 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="w-3/4 h-3.5" />
                <Skeleton className="w-1/3 h-3" />
              </div>
            </div>
          ))}
        </div>
      ) : (notifications ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BellOff size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm">When people interact with your content, you'll see it here</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {(notifications ?? []).map((notif: any) => {
            const typeInfo = NOTIF_ICONS[notif.type] ?? { icon: Bell, color: "text-muted-foreground" };
            const Icon = typeInfo.icon;

            return (
              <div
                key={notif.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl transition-colors cursor-pointer group",
                  !notif.isRead ? "bg-accent/40 hover:bg-accent/60" : "hover:bg-muted/50"
                )}
                onClick={() => !notif.isRead && handleMarkOne(notif.id)}
              >
                {/* Actor avatar + type icon */}
                <div className="relative shrink-0">
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={notif.actor?.avatarUrl} />
                    <AvatarFallback>{notif.actor?.fullName?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background flex items-center justify-center ring-1 ring-background",
                    typeInfo.color
                  )}>
                    <Icon size={11} className={typeInfo.color} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    {notif.actor && (
                      <span className="font-semibold">{notif.actor.fullName} </span>
                    )}
                    {notif.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Unread dot */}
                {!notif.isRead && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
