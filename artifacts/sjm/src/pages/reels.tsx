import { useState, useRef, useEffect } from "react";
import { useListReels, useLikeReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, Music, MoreHorizontal } from "lucide-react";

function ReelItem({ reel, isActive }: { reel: any; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(reel.isLiked);
  const [likesCount, setLikesCount] = useState(reel.likesCount);
  const likeReel = useLikeReel();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [isActive]);

  function togglePlay() {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  }

  function handleLike() {
    setLiked((l: boolean) => !l);
    setLikesCount((c: number) => liked ? c - 1 : c + 1);
    likeReel.mutate({ id: reel.id }, {
      onSettled: () => queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() }),
    });
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {reel.videoUrl ? (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          className="w-full h-full object-cover"
          loop
          muted={muted}
          playsInline
          onClick={togglePlay}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center cursor-pointer"
          style={{ background: "linear-gradient(135deg, #1e1b4b, #4c1d95)" }}
          onClick={togglePlay}
        >
          <div className="text-center text-white p-8">
            {reel.thumbnailUrl ? (
              <img src={reel.thumbnailUrl} alt="" className="max-w-full max-h-64 rounded-xl mx-auto mb-4" />
            ) : (
              <Play size={64} className="mx-auto mb-4 opacity-40" />
            )}
            <p className="text-lg font-medium opacity-80">{reel.caption || "Reel preview"}</p>
          </div>
        </div>
      )}

      {/* Overlay */}
      {!playing && (
        <button
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Play size={28} className="text-white fill-white ml-1" />
          </div>
        </button>
      )}

      {/* Controls overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-16 p-4 pb-6 pointer-events-auto">
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/profile/${reel.author?.id}`}>
              <a>
                <Avatar className="w-9 h-9 ring-2 ring-white/40">
                  <AvatarImage src={reel.author?.avatarUrl} />
                  <AvatarFallback className="text-xs">{reel.author?.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
              </a>
            </Link>
            <div>
              <Link href={`/profile/${reel.author?.id}`}>
                <a className="text-white font-semibold text-sm hover:underline">{reel.author?.fullName}</a>
              </Link>
              {reel.author?.isVerified && <span className="ml-1 text-primary text-xs">✓</span>}
            </div>
          </div>
          {reel.caption && (
            <p className="text-white text-sm leading-relaxed line-clamp-2 mb-2">{reel.caption}</p>
          )}
          {reel.hashtags?.length > 0 && (
            <p className="text-white/70 text-xs">
              {reel.hashtags.map((t: string) => `#${t}`).join(" ")}
            </p>
          )}
          {reel.sound && (
            <div className="flex items-center gap-1.5 mt-2 text-white/70 text-xs">
              <Music size={12} />
              <span>{reel.sound}</span>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="absolute right-3 bottom-6 flex flex-col items-center gap-5 pointer-events-auto">
          <button className="flex flex-col items-center gap-1" onClick={handleLike}>
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <Heart size={22} className={liked ? "fill-rose-500 text-rose-500" : "text-white"} />
            </div>
            <span className="text-white text-xs font-medium">{likesCount > 0 ? likesCount : ""}</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <MessageCircle size={22} className="text-white" />
            </div>
            <span className="text-white text-xs font-medium">{reel.commentsCount > 0 ? reel.commentsCount : ""}</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <Share2 size={22} className="text-white" />
            </div>
          </button>

          <button onClick={() => setMuted(m => !m)}>
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              {muted ? <VolumeX size={20} className="text-white" /> : <Volume2 size={20} className="text-white" />}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReelsPage() {
  const { data: reels, isLoading } = useListReels({});
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.getAttribute("data-index") ?? "0", 10);
            setActiveIndex(idx);
          }
        });
      },
      { root: el, threshold: 0.6 }
    );
    const items = el.querySelectorAll("[data-index]");
    items.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, [reels]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-black">
        <div className="text-white/50 text-sm animate-pulse">Loading reels...</div>
      </div>
    );
  }

  const list = reels ?? [];

  if (list.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <Play size={48} className="mb-4 opacity-30" />
        <p className="text-lg font-medium">No reels yet</p>
        <p className="text-white/50 text-sm">Be the first to post a reel!</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black"
      style={{ scrollSnapType: "y mandatory" }}
    >
      {list.map((reel: any, i: number) => (
        <div
          key={reel.id}
          data-index={i}
          className="w-full h-screen snap-start snap-always"
          style={{ scrollSnapAlign: "start" }}
        >
          <ReelItem reel={reel} isActive={i === activeIndex} />
        </div>
      ))}
    </div>
  );
}
