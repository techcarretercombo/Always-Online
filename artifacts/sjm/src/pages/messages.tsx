import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import {
  useGetMe, useListConversations, useListMessages, useSendMessage,
  useCreateConversation, useListUsers, getListUsersQueryKey,
  getListMessagesQueryKey, getListConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Send, MessageCircle, Search, MoreHorizontal, Phone, Video, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CallOverlay } from "@/components/call/CallOverlay";

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

export default function MessagesPage() {
  const [, params] = useRoute("/messages/:id");
  const { data: me } = useGetMe();
  const { data: conversations, isLoading: convsLoading } = useListConversations();
  const [activeConvId, setActiveConvId] = useState<number | null>(params?.id ? parseInt(params.id) : null);
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Call state
  const [activeCall, setActiveCall] = useState<{
    peer: { id: number; fullName: string; avatarUrl?: string | null };
    mode: "audio" | "video";
    direction: "outgoing" | "incoming";
    offer?: RTCSessionDescriptionInit;
  } | null>(null);
  const incomingPollRef = useRef<number | null>(null);
  const incomingSinceRef = useRef(Date.now());

  const { data: messages, isLoading: msgsLoading } = useListMessages(
    activeConvId ?? 0,
    { query: { enabled: !!activeConvId, queryKey: getListMessagesQueryKey(activeConvId ?? 0) } }
  );
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();

  const { data: userResults } = useListUsers(
    { search: userSearch },
    { query: { enabled: userSearch.length > 1, queryKey: getListUsersQueryKey({ search: userSearch }) } }
  );

  // Poll for incoming calls when no active call
  useEffect(() => {
    if (!me?.id || activeCall) return;
    incomingSinceRef.current = Date.now() - 2000;
    incomingPollRef.current = window.setInterval(async () => {
      if (activeCall) return;
      const token = localStorage.getItem("sjm_token");
      const res = await fetch(`/api/signals?since=${incomingSinceRef.current}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const sigs: { id: string; from: number; type: string; payload: any }[] = await res.json();
      incomingSinceRef.current = Date.now();
      for (const sig of sigs) {
        if (sig.type === "ring") {
          // Incoming call ring — look up who's calling
          const callerName = sig.payload?.callerName ?? "Someone";
          const callerAvatar = sig.payload?.callerAvatar ?? null;
          const mode = sig.payload?.mode ?? "audio";
          // Delete ring signal
          await fetch(`/api/signals/${sig.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          // Get the offer signal
          const offerRes = await fetch(`/api/signals?from=${sig.from}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          let offer: RTCSessionDescriptionInit | undefined;
          if (offerRes.ok) {
            const offerSigs = await offerRes.json();
            const offerSig = offerSigs.find((s: any) => s.type === "offer");
            if (offerSig) {
              offer = offerSig.payload;
              await fetch(`/api/signals/${offerSig.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
            }
          }
          setActiveCall({
            peer: { id: sig.from, fullName: callerName, avatarUrl: callerAvatar },
            mode,
            direction: "incoming",
            offer,
          });
          break;
        }
      }
    }, 2000);
    return () => { if (incomingPollRef.current) clearInterval(incomingPollRef.current); };
  }, [me?.id, activeCall]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function startCall(mode: "audio" | "video") {
    if (!otherPerson || !me) return;
    setActiveCall({
      peer: { id: otherPerson.id, fullName: otherPerson.fullName, avatarUrl: otherPerson.avatarUrl },
      mode,
      direction: "outgoing",
    });
  }

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
        onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
      }
    );
  }

  function handleNewChat(user: any) {
    createConversation.mutate(
      { data: { participantIds: [user.id], isGroup: false } },
      {
        onSuccess: (conv: any) => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setActiveConvId(conv.id);
          setNewChatOpen(false);
          setUserSearch("");
        },
        onError: () => toast({ title: "Could not start conversation", variant: "destructive" }),
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
    <>
      <div className="flex h-screen max-h-screen overflow-hidden">
        {/* Sidebar */}
        <div className={cn(
          "w-full lg:w-80 xl:w-96 border-r border-border flex flex-col bg-sidebar shrink-0",
          activeConvId ? "hidden lg:flex" : "flex"
        )}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h1 className="font-bold text-lg">Messages</h1>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="New conversation"
                onClick={() => setNewChatOpen(true)}
              >
                <Edit size={16} />
              </Button>
            </div>
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
                <p className="text-xs mb-3">Start chatting with someone</p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewChatOpen(true)}>
                  <Edit size={13} />
                  New message
                </Button>
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
          <div className="flex-1 flex flex-col min-w-0">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Voice call" onClick={() => startCall("audio")}><Phone size={16} /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Video call" onClick={() => startCall("video")}><Video size={16} /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal size={16} /></Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {msgsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <Skeleton className="h-9 w-36 rounded-2xl" />
                  </div>
                ))
              ) : msgList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle size={36} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs">Say hello!</p>
                </div>
              ) : (
                msgList.map((msg: any) => {
                  const isOwn = msg.senderId === me?.id;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                      {!isOwn && (
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarImage src={msg.sender?.avatarUrl} />
                          <AvatarFallback className="text-xs">{msg.sender?.fullName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}>
                        {msg.content}
                        <div className={`text-[10px] mt-0.5 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: false })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border flex items-center gap-2 bg-sidebar">
              <Input
                className="flex-1 rounded-full bg-muted border-0 h-10 px-4 text-sm"
                placeholder="Type a message..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                size="icon"
                className="rounded-full h-10 w-10 shrink-0"
                onClick={handleSend}
                disabled={!text.trim() || sendMessage.isPending}
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden lg:flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle size={28} className="opacity-40" />
            </div>
            <p className="font-medium">Select a conversation</p>
            <p className="text-sm">Or start a new one</p>
            <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={() => setNewChatOpen(true)}>
              <Edit size={13} />
              New message
            </Button>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search people..."
                className="pl-9"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {userSearch.length > 1 && (userResults ?? []).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
              )}
              {(userResults ?? [])
                .filter((u: any) => u.id !== me?.id)
                .map((u: any) => (
                  <button
                    key={u.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                    onClick={() => handleNewChat(u)}
                    disabled={createConversation.isPending}
                  >
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={u.avatarUrl ?? undefined} />
                      <AvatarFallback>{u.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                    </div>
                  </button>
                ))}
              {userSearch.length <= 1 && (
                <p className="text-center text-xs text-muted-foreground py-6">Type at least 2 characters to search</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active call overlay */}
      {activeCall && me && (
        <CallOverlay
          me={{ id: me.id, fullName: me.fullName, avatarUrl: me.avatarUrl }}
          peer={activeCall.peer}
          mode={activeCall.mode}
          direction={activeCall.direction}
          incomingOffer={activeCall.offer}
          onEnd={() => setActiveCall(null)}
        />
      )}
    </>
  );
}
