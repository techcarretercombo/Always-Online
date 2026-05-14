import { useEffect, useRef, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from "lucide-react";

const STUN = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

type CallState = "ringing" | "connecting" | "active" | "ended";

interface Props {
  me: { id: number; fullName: string; avatarUrl?: string | null };
  peer: { id: number; fullName: string; avatarUrl?: string | null };
  mode: "audio" | "video";
  direction: "outgoing" | "incoming";
  incomingOffer?: RTCSessionDescriptionInit;
  onEnd: () => void;
}

async function postSignal(to: number, type: string, payload: unknown) {
  const token = localStorage.getItem("sjm_token");
  await fetch("/api/signals", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, type, payload }),
  });
}

async function pollSignals(from: number, since: number): Promise<{ id: string; type: string; payload: unknown }[]> {
  const token = localStorage.getItem("sjm_token");
  const res = await fetch(`/api/signals?from=${from}&since=${since}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function deleteSignal(id: string) {
  const token = localStorage.getItem("sjm_token");
  await fetch(`/api/signals/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}

export function CallOverlay({ me, peer, mode, direction, incomingOffer, onEnd }: Props) {
  const [callState, setCallState] = useState<CallState>(direction === "incoming" ? "ringing" : "connecting");
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pollTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const sinceRef = useRef(Date.now() - 2000);

  const cleanUp = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const endCall = useCallback(() => {
    postSignal(peer.id, "end", {}).catch(() => {});
    cleanUp();
    setCallState("ended");
    setTimeout(onEnd, 1200);
  }, [peer.id, cleanUp, onEnd]);

  const startElapsed = useCallback(() => {
    elapsedTimerRef.current = window.setInterval(() => setElapsed(s => s + 1), 1000);
  }, []);

  const setupPC = useCallback(async () => {
    const pc = new RTCPeerConnection(STUN);
    pcRef.current = pc;

    const constraints = mode === "video" ? { video: true, audio: true } : { audio: true };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      stream = new MediaStream();
    }
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = e => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = e => {
      if (e.candidate) {
        postSignal(peer.id, "ice", e.candidate.toJSON()).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("active");
        startElapsed();
      } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setCallState("ended");
        cleanUp();
        setTimeout(onEnd, 1200);
      }
    };

    return pc;
  }, [mode, peer.id, cleanUp, onEnd, startElapsed]);

  const startOutgoing = useCallback(async () => {
    await postSignal(peer.id, "ring", { mode, callerName: me.fullName, callerAvatar: me.avatarUrl });
    const pc = await setupPC();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await postSignal(peer.id, "offer", offer);

    sinceRef.current = Date.now();
    pollTimerRef.current = window.setInterval(async () => {
      const sigs = await pollSignals(peer.id, sinceRef.current);
      for (const sig of sigs) {
        sinceRef.current = Math.max(sinceRef.current, Date.now());
        await deleteSignal(sig.id);
        if (sig.type === "answer") {
          await pc.setRemoteDescription(sig.payload as RTCSessionDescriptionInit);
        } else if (sig.type === "ice") {
          try { await pc.addIceCandidate(new RTCIceCandidate(sig.payload as RTCIceCandidateInit)); } catch {}
        } else if (sig.type === "reject" || sig.type === "end") {
          setCallState("ended");
          cleanUp();
          setTimeout(onEnd, 1200);
        }
      }
    }, 1000);
  }, [peer.id, mode, me, setupPC, cleanUp, onEnd]);

  const acceptCall = useCallback(async () => {
    setCallState("connecting");
    const pc = await setupPC();
    await pc.setRemoteDescription(incomingOffer!);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await postSignal(peer.id, "answer", answer);

    sinceRef.current = Date.now();
    pollTimerRef.current = window.setInterval(async () => {
      const sigs = await pollSignals(peer.id, sinceRef.current);
      for (const sig of sigs) {
        sinceRef.current = Math.max(sinceRef.current, Date.now());
        await deleteSignal(sig.id);
        if (sig.type === "ice") {
          try { await pc.addIceCandidate(new RTCIceCandidate(sig.payload as RTCIceCandidateInit)); } catch {}
        } else if (sig.type === "end") {
          setCallState("ended");
          cleanUp();
          setTimeout(onEnd, 1200);
        }
      }
    }, 1000);
  }, [peer.id, incomingOffer, setupPC, cleanUp, onEnd]);

  const rejectCall = useCallback(async () => {
    await postSignal(peer.id, "reject", {});
    cleanUp();
    onEnd();
  }, [peer.id, cleanUp, onEnd]);

  useEffect(() => {
    if (direction === "outgoing") {
      startOutgoing();
    }
    return cleanUp;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  }

  function toggleVideo() {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = videoOff; });
    setVideoOff(v => !v);
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const stateLabel =
    callState === "ringing" ? (direction === "incoming" ? "Incoming call..." : "Ringing...") :
    callState === "connecting" ? "Connecting..." :
    callState === "active" ? fmtTime(elapsed) :
    "Call ended";

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between py-12 select-none">
      {/* Remote video */}
      {mode === "video" && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
      )}

      {/* Top info */}
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <Avatar className="w-24 h-24 ring-4 ring-white/20">
          <AvatarImage src={peer.avatarUrl ?? undefined} />
          <AvatarFallback className="text-4xl">{peer.fullName.charAt(0)}</AvatarFallback>
        </Avatar>
        <h2 className="text-white text-2xl font-bold">{peer.fullName}</h2>
        <p className="text-white/60 text-sm">{stateLabel}</p>
      </div>

      {/* Local video PiP */}
      {mode === "video" && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-32 right-4 w-28 h-36 object-cover rounded-xl border-2 border-white/30 z-10"
        />
      )}

      {/* Controls */}
      <div className="relative z-10 flex flex-col items-center gap-6 w-full px-8">
        {callState === "ringing" && direction === "incoming" ? (
          <div className="flex items-center justify-around w-full max-w-xs">
            <div className="flex flex-col items-center gap-2">
              <button
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                onClick={rejectCall}
              >
                <PhoneOff size={26} className="text-white" />
              </button>
              <span className="text-white/60 text-xs">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
                onClick={acceptCall}
              >
                <Phone size={26} className="text-white" />
              </button>
              <span className="text-white/60 text-xs">Accept</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${muted ? "bg-white text-black" : "bg-white/20 text-white"}`}
                onClick={toggleMute}
              >
                {muted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <span className="text-white/50 text-xs">{muted ? "Unmute" : "Mute"}</span>
            </div>
            {mode === "video" && (
              <div className="flex flex-col items-center gap-2">
                <button
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${videoOff ? "bg-white text-black" : "bg-white/20 text-white"}`}
                  onClick={toggleVideo}
                >
                  {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
                <span className="text-white/50 text-xs">{videoOff ? "Show" : "Hide"}</span>
              </div>
            )}
            <div className="flex flex-col items-center gap-2">
              <button
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                onClick={endCall}
              >
                <PhoneOff size={24} className="text-white" />
              </button>
              <span className="text-white/60 text-xs">End</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center">
                <Volume2 size={20} />
              </button>
              <span className="text-white/50 text-xs">Speaker</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
