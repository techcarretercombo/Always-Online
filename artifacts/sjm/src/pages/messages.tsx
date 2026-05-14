import { useState, useRef, useEffect } from "react";
import { useRoute } from "wouter";
import { useGetMe, useListConversations, useListMessages, useSendMessage, useCreateConversation, getListMessagesQueryKey, getListConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageCircle, Search, MoreHorizontal, Phone, Video } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function ConversationItem({ conv, active, onClick, me }: { conv: any; active: boolean; onClick: () => void; me: any }) {
  const other = conv.participants?.find((p: any) => p.id !== me?.id) ?? conv.participants?.[0];
  const name = conv.isGroup ? conv.groupName : other?.fullName;
  const avatar = conv.isGroup ? null : other?.avatarUrl;

  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="relative shrink-0">
        <Avatar className="w-11 h-11">
          <AvatarImage src={avatar} />
          <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
        </Avatar>
        {conv.unreadCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">{conv.unreadCount > 9 ? "9+" : conv.unreadCount}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm truncate text-foreground">{name}</span>
          {conv.lastMessage && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {conv.lastMessage ? conv.lastMessage.content : "Start a conversation"}
        </p>
      </div>
    </button>
  );
}

function MessageBubble({ msg, me }: { msg: any; me: any }) {
  const isMe = msg.senderId === me?.id;
  return (
    <div className={cn("flex gap-2 items-end", isMe ? "flex-row-reverse" : "")}>
      {!isMe && (
        <Avatar className="w-7 h-7 shrink-0 mb-0.5">
          <AvatarImage src={msg.sender?.avatarUrl} />
          <AvatarFallback className="text-xs">{msg.sender?.fullName?.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-xs rounded-2xl px-3.5 py-2 text-sm shadow-sm",
          isMe
            ? "sjm-gradient text-white rounded-br-sm"
            : "bg-card border border-border rounded-bl-sm"
        )}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const [, params] = useRoute("/messages/:id");
  const { data: me } = useGetMe();
  const { data: conversations, isLoading: convsLoading } = useListConversations();
  const [activeConvId, setActiveConvId] = useState<number | null>(params?.id ? parseInt(params.id) : null);
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: msgsLoading } = useListMessages(
    activeConvId ?? 0,
    { query: { enabled: !!activeConvId, queryKey: getListMessagesQueryKey(activeConvId ?? 0) } }
  );
  const sendMessage = useSendMessage();

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleSend() {
    if (!text.trim() || !activeConvId) return;
    const content = text;
    setText("");
    sendMessage.mutate(
      { id: activeConvId!, data: { content, type: "text" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeConvId!) });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        },
      }
    );
  }

  const filteredConvs = (conversations ?? []).filter((c: any) => {
    if (!search) return true;
    const other = c.participants?.find((p: any) => p.id !== me?.id);
    return other?.fullName?.toLowerCase().includes(search.toLowerCase()) || c.groupName?.toLowerCase().includes(search.toLowerCase());
  });

  const activeConv = (conversations ?? []).find((c: any) => c.id === activeConvId);
  const otherPerson = activeConv?.participants?.find((p: any) => p.id !== me?.id) ?? activeConv?.participants?.[0];

  const msgList = [...(messages ?? [])].reverse();

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
      {/* Sidebar */}
      <div className={cn(
        "w-full lg:w-80 xl:w-96 border-r border-border flex flex-col bg-sidebar shrink-0",
        activeConvId ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-4 border-b border-border">
          <h1 className="font-bold text-lg mb-3">Messages</h1>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="w-24 h-3.5" />
                  <Skeleton className="w-32 h-3" />
                </div>
              </div>
            ))
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MessageCircle size={36} className="mb-3 opacity-30" />
              <p className="font-medium text-sm">No conversations yet</p>
              <p className="text-xs">Start chatting with someone</p>
            </div>
          ) : (
            filteredConvs.map((conv: any) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeConvId}
                onClick={() => setActiveConvId(conv.id)}
                me={me}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {activeConvId ? (
        <div className={cn("flex-1 flex flex-col", !activeConvId ? "hidden lg:flex" : "flex")}>
          {/* Chat header */}
          <div className="px-4 h-14 border-b border-border flex items-center gap-3 bg-sidebar">
            <button className="lg:hidden text-muted-foreground mr-1" onClick={() => setActiveConvId(null)}>←</button>
            <Avatar className="w-9 h-9">
              <AvatarImage src={otherPerson?.avatarUrl ?? undefined} />
              <AvatarFallback>{otherPerson?.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{activeConv?.isGroup ? (activeConv.groupName ?? "") : otherPerson?.fullName}</p>
              <p className="text-xs text-muted-foreground">Active now</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Phone size={16} /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Video size={16} /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal size={16} /></Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {msgsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn("flex gap-2", i % 2 === 0 ? "" : "flex-row-reverse")}>
                  <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                  <Skeleton className="w-48 h-9 rounded-2xl" />
                </div>
              ))
            ) : msgList.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                No messages yet. Say hello!
              </div>
            ) : (
              msgList.map((msg: any) => (
                <MessageBubble key={msg.id} msg={msg} me={me} />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-sidebar">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a message..."
                className="flex-1 rounded-full text-sm h-10"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <Button
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
                onClick={handleSend}
                disabled={!text.trim() || sendMessage.isPending}
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden lg:flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageCircle size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">Select a conversation</p>
            <p className="text-sm">Choose from your messages on the left</p>
          </div>
        </div>
      )}
    </div>
  );
}
