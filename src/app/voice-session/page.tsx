"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { flushSync } from "react-dom";
import { Mic, MicOff, X, Activity, Loader2, Clock, MessageSquare, Keyboard, ArrowUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useConversation } from "@elevenlabs/react";
import { createClient } from "@/lib/supabase/client";

// --- HELPERS ---
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatMinutes(seconds: number) {
  if (seconds <= 0) return "0 min";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

type Message = {
  id: string;
  role: "agent" | "user";
  text: string;
};

// --- CORE CONTENT COMPONENT ---
function VoiceSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDiscovery = searchParams.get("mode") === "discovery";

  // Logic & State
  const [micMuted, setMicMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [timer, setTimer] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [capError, setCapError] = useState<string | null>(null);
  const [startingMode, setStartingMode] = useState<"voice" | "text" | null>(null);
  const [isTextMode, setIsTextMode] = useState(false);
  const [inputText, setInputText] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageIdCounter = useRef(0);
  const conversationDbId = useRef<string | null>(null);
  const isEndingRef = useRef(false);
  const conversationRef = useRef<any>(null);

  // 1. ELEVENLABS SDK HOOK
  const conversation = useConversation({
    micMuted,
    onConnect: () => {
      const elevenLabsId = conversationRef.current?.getId();
      if (conversationDbId.current && elevenLabsId) {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          fetch("/api/elevenlabs", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ conversationDbId: conversationDbId.current, elevenLabsConversationId: elevenLabsId }),
          }).catch(console.error);
        });
      }
    },
    onDisconnect: () => {
      if (!isEndingRef.current) {
        setError("Connection lost. Please try again.");
      }
    },
    onError: (err) => {
      console.error("Connection error:", err);
      setError("Connection disrupted. Please try again.");
    },
    onMessage: (message) => {
      if (!message.message) return;
      const id = String(++messageIdCounter.current);
      if (message.role === "user") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "user" && last.text === message.message) return prev;
          return [...prev, { id, role: "user", text: message.message! }];
        });
      } else {
        setMessages((prev) => [...prev, { id, role: "agent", text: message.message! }]);
      }
    },
  });

  conversationRef.current = conversation;
  const { status, isSpeaking } = conversation;
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isIdle = !isConnected && !isConnecting;

  // 2. LIFECYCLE EFFECTS
  useEffect(() => {
    return () => { conversationRef.current?.endSession().catch(() => {}); };
  }, []);

  useEffect(() => {
    if (showTranscript) transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showTranscript]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => setTimer((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    if (isIdle) return;
    const handleBeforeUnload = () => { conversation.endSession().catch(() => {}); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isIdle, conversation]);

  useEffect(() => {
    if (remainingSeconds === null) return;
    if (isConnected && timer >= remainingSeconds) {
      setError("Weekly allowance reached. Session ending.");
      handleEndSession();
    }
  }, [timer, remainingSeconds, isConnected]);

  // 3. HANDLERS
  const startConversation = useCallback(async (mode: "voice" | "text") => {
    try {
      setStartingMode(mode);
      setError(null);
      setCapError(null);
      isEndingRef.current = false;

      flushSync(() => {
        setIsTextMode(mode === "text");
        if (mode === "text") { setMicMuted(true); setShowTranscript(true); }
      });

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not signed in."); return; }

      const res = await fetch("/api/elevenlabs", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 429) {
        const body = await res.json();
        setCapError(body.message ?? "Weekly limit reached.");
        return;
      }
      if (!res.ok) throw new Error("API Connection Error");

      const data = await res.json();
      conversationDbId.current = data.conversationDbId;
      setRemainingSeconds(data.remainingSeconds ?? null);

      // FIXED: Added required connectionType property
      await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
        connectionType: "websocket",
        dynamicVariables: {
          ...data.dynamicVariables,
          _is_discovery_: isDiscovery ? "true" : "false",
        },
      });
    } catch (err) {
      setError("Unable to connect. Please try again.");
    } finally {
      setStartingMode(null);
    }
  }, [conversation, isDiscovery]);

  const handleEndSession = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    conversation.setVolume({ volume: 0 });
    await conversation.endSession().catch(() => {});
    
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      if (conversationDbId.current) {
        fetch("/api/elevenlabs", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ conversationDbId: conversationDbId.current }),
        }).catch(console.error);
      }
      if (isDiscovery) {
        await supabase.from("profiles").update({ 
          discovery_completed: true, 
          program_phase: "active", 
          updated_at: new Date().toISOString() 
        }).eq("id", session.user.id);
      }
    }
    setTimeout(() => router.push("/dashboard"), 1500);
  }, [conversation, router, isDiscovery]);

  const handleSendText = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !isConnected) return;
    setInputText("");
    const id = String(++messageIdCounter.current);
    setMessages((prev) => [...prev, { id, role: "user", text }]);
    try { conversation.sendUserMessage(text); } catch { /* ignore */ }
    inputRef.current?.focus();
  }, [inputText, isConnected, conversation]);

  const getOrbGlow = () => {
    if (isSpeaking) return "bg-brand-light/60";
    if (isConnected) return "bg-brand-mid/40";
    return "bg-brand-mid/10";
  };

  // 4. RENDER: LIMIT ERROR
  if (capError) {
    return (
      <main className="h-screen bg-brand-dark text-white font-sans flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-mid/20 flex items-center justify-center mb-2">
          <Clock className="w-10 h-10 text-brand-light" />
        </div>
        <h2 className="font-heading text-3xl tracking-widest uppercase">Limit Reached</h2>
        <p className="text-white/70 text-sm mb-10 max-w-xs">{capError}</p>
        <button onClick={() => router.push("/dashboard")} className="mt-4 px-8 py-3.5 bg-brand-light text-brand-dark font-bold rounded-2xl">Return to Dashboard</button>
      </main>
    );
  }

  return (
    // FIXED: Updated h-[100dvh] to canonical h-dvh
    <main className="h-dvh bg-brand-dark text-white font-sans flex flex-col relative overflow-hidden">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 opacity-40 pointer-events-none z-0">
        {/* FIXED: Updated w/h Custom values to canonical TW4 values */}
        <div className={`absolute top-[20%] left-1/2 -translate-x-1/2 w-125 h-125 rounded-full blur-[120px] transition-all duration-1000 ${getOrbGlow()}`} />
      </div>

      {/* HEADER */}
      <header className="relative z-30 px-6 pt-12 pb-4 flex items-center justify-between border-b border-white/5 bg-brand-dark/50 backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-green flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-brand-green animate-pulse' : 'bg-white/20'}`} />
            {isConnected ? 'Live Link' : 'Secure Connection'}
          </span>
          <h1 className="font-logo font-bold tracking-widest text-sm mt-0.5">COACH STRONG AI</h1>
        </div>

        {!isIdle && (
          <div className="text-right">
             <div className="font-heading text-2xl tracking-tighter leading-none">{formatTime(timer)}</div>
             {remainingSeconds !== null && (
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                  {formatMinutes(remainingSeconds - timer)} left
                </span>
              )}
          </div>
        )}
      </header>

      {/* VIEW: START CHOICE */}
      {isIdle && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
          <h2 className="font-heading text-4xl tracking-widest mb-4 uppercase">
            {isDiscovery ? "Initialization" : "Connect with Coach Strong"}
          </h2>
          <p className="text-white/60 text-sm text-center mb-10 max-w-xs">
            How would you like to connect with Coach Strong today?
          </p>
          <div className="w-full max-w-sm space-y-3">
            <button onClick={() => startConversation("voice")} disabled={!!startingMode} className="w-full bg-brand-light text-brand-dark font-bold text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl active:scale-95 flex items-center justify-center gap-3">
              {startingMode === 'voice' ? <Loader2 className="animate-spin" /> : <Mic className="w-4 h-4" />} Voice call
            </button>
            <button onClick={() => startConversation("text")} disabled={!!startingMode} className="w-full bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-[0.2em] py-5 rounded-2xl active:scale-95 flex items-center justify-center gap-3">
              {startingMode === 'text' ? <Loader2 className="animate-spin" /> : <Keyboard className="w-4 h-4" />} Text Chat
            </button>
          </div>
          <button onClick={() => router.push("/dashboard")} className="mt-8 text-[10px] font-bold text-white/30 uppercase tracking-widest hover:text-white transition-colors">Cancel & Return</button>
        </div>
      )}

      {/* VIEW: VOICE INTERFACE */}
      {!isIdle && !showTranscript && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
          <div className={`relative w-64 h-64 flex items-center justify-center transition-all duration-700 ${isSpeaking ? 'scale-110' : 'scale-100'}`}>
            <div className={`absolute inset-0 bg-brand-light/20 rounded-full transition-all duration-700 ${isSpeaking ? "scale-[1.5] opacity-50 blur-xl" : "scale-100 opacity-0 blur-md"}`} />
            {/* FIXED: Updated gradient and rounded values to canonical */}
            <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 shadow-2xl ${isSpeaking ? "bg-linear-to-tr from-brand-light to-[#0de0ff]" : "bg-brand-dark border border-brand-light/30"}`}>
              {isConnecting ? (
                <Loader2 className="w-10 h-10 text-brand-light animate-spin" />
              ) : (
                <Image src="/Logo_square_OG.png" alt="Coach Strong" width={60} height={60} className={`brightness-0 invert transition-all duration-300 ${isSpeaking ? "scale-110" : "scale-100 opacity-70"}`} />
              )}
            </div>
          </div>
          <p className="mt-12 text-[10px] font-black uppercase tracking-[0.3em] text-brand-light/60">
            {isSpeaking ? 'Coach is speaking...' : 'Listening...'}
          </p>

          <div className="absolute bottom-12 flex items-center gap-6">
            <button onClick={() => setMicMuted(!micMuted)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${micMuted ? "bg-red-500/20 text-red-500 border border-red-500" : "bg-white/10 text-white border border-white/10"}`}>
              {micMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <button onClick={handleEndSession} className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-500/20 active:scale-95">
              <X className="w-10 h-10" />
            </button>
            <button onClick={() => setShowTranscript(true)} className="w-16 h-16 bg-white/10 text-white rounded-full flex items-center justify-center border border-white/10">
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW: CHAT INTERFACE */}
      {!isIdle && showTranscript && (
        <div className="relative z-10 flex-1 flex flex-col min-h-0 bg-brand-dark/20 backdrop-blur-xl">
           <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {/* FIXED: rounded-[2rem] updated to rounded-4xl */}
                  <div className={`max-w-[85%] px-5 py-3.5 rounded-4xl text-sm leading-relaxed ${msg.role === "user" ? "bg-brand-light text-brand-dark rounded-br-none" : "bg-white/10 text-white rounded-bl-none border border-white/5"}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
           </div>
           <form onSubmit={handleSendText} className="p-4 bg-brand-dark border-t border-white/5 pb-10 flex items-center gap-3">
              <input ref={inputRef} autoFocus className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-4 text-sm focus:outline-none" placeholder="Type..." value={inputText} onChange={(e) => setInputText(e.target.value)} style={{ fontSize: '16px' }} />
              <button type="submit" className="w-12 h-12 bg-brand-light rounded-full flex items-center justify-center text-brand-dark"><ArrowUp className="w-5 h-5" /></button>
              <button type="button" onClick={() => { setShowTranscript(false); setMicMuted(false); }} className="w-12 h-12 bg-white/5 rounded-full text-white"><Mic className="w-5 h-5" /></button>
           </form>
        </div>
      )}

      {/* ERROR OVERLAY */}
      {/* FIXED: z-[100] updated to z-100 */}
      {error && <div className="absolute top-24 left-1/2 -translate-x-1/2 z-100 bg-red-500 text-white px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl">{error}</div>}
    </main>
  );
}

// --- EXPORT WRAPPED IN SUSPENSE ---
export default function VoiceSessionPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-brand-dark flex items-center justify-center"><Loader2 className="animate-spin text-brand-light" /></div>}>
      <VoiceSessionContent />
    </Suspense>
  );
}