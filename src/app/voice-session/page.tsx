"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { Mic, MicOff, X, Activity, Loader2, Clock, MessageSquare, Keyboard, ArrowUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useConversation } from "@elevenlabs/react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  role: "agent" | "user";
  text: string;
};

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

export default function VoiceSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDiscovery = searchParams.get("mode") === "discovery";
  const [micMuted, setMicMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [timer, setTimer] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const[error, setError] = useState<string | null>(null);
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
  const conversationRef = useRef<ReturnType<typeof useConversation> | null>(null);

  const conversation = useConversation({
    micMuted,
    textOnly: isTextMode,
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
      console.log("Coach Strong disconnected");
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
          return[...prev, { id, role: "user", text: message.message }];
        });
      } else {
        setMessages((prev) =>[...prev, { id, role: "agent", text: message.message }]);
      }
    },
  });

  // Keep ref in sync so callbacks always see the latest conversation object
  conversationRef.current = conversation;

  const { status, isSpeaking } = conversation;
  const isConnected  = status === "connected";
  const isConnecting = status === "connecting";
  const isIdle       = !isConnected && !isConnecting;

  // Clean up on unmount (SPA navigation doesn't trigger beforeunload)
  useEffect(() => {
    return () => {
      conversationRef.current?.endSession().catch(() => {});
    };
  }, []);

  // Auto-scroll transcript when in chat mode
  useEffect(() => {
    if (showTranscript) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showTranscript]);

  // Session timer
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => setTimer((s) => s + 1), 1000);
    return () => clearInterval(interval);
  },[isConnected]);

  // End session if user navigates away (back button, closing tab, etc.)
  useEffect(() => {
    if (isIdle) return;
    const handleBeforeUnload = () => { conversation.endSession().catch(() => {}); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isIdle, conversation]);

  // Auto-end at weekly cap
  useEffect(() => {
    if (remainingSeconds === null) return;
    if (isConnected && timer >= remainingSeconds) {
      setError("Weekly allowance reached. Session ending.");
      handleEndSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, remainingSeconds, isConnected]);

  const startConversation = useCallback(async (mode: "voice" | "text") => {
    try {
      setStartingMode(mode);
      setError(null);
      setCapError(null);
      isEndingRef.current = false;

      // Flush state synchronously so useConversation re-renders with the correct
      // textOnly value BEFORE startSession is called — otherwise the SDK starts
      // a voice session regardless of the user's choice.
      flushSync(() => {
        if (mode === "text") {
          setIsTextMode(true);
          setMicMuted(true);
          setShowTranscript(true);
        } else {
          setIsTextMode(false);
          setMicMuted(false);
          setShowTranscript(false);
        }
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`API error ${res.status}: ${body.detail ?? body.error ?? "unknown"}`);
      }

      const data = await res.json();
      conversationDbId.current = data.conversationDbId;
      setRemainingSeconds(data.remainingSeconds ?? null);

      await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
        connectionType: "websocket",
        dynamicVariables: {
          ...data.dynamicVariables,
          _is_discovery_: isDiscovery ? "true" : "false",
        },
        textOnly: mode === "text",
        overrides: {
          conversation: { textOnly: mode === "text" },
        },
      });
    } catch (err) {
      console.error("Failed to start:", err);
      setError("Unable to connect. Please try again.");
    } finally {
      setStartingMode(null);
    }
  }, [conversation]);

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
        await supabase
          .from("profiles")
          .update({ discovery_completed: true, program_phase: "discovery_complete", updated_at: new Date().toISOString() })
          .eq("id", session.user.id);
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

  // ---------------------------------------------------------------------------
  // RENDER: Cap Limit Screen
  // ---------------------------------------------------------------------------
  if (capError) {
    return (
      <main className="h-[100dvh] bg-brand-dark text-white font-sans flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-mid/20 flex items-center justify-center mb-2">
          <Clock className="w-10 h-10 text-brand-light" />
        </div>
        <h1 className="font-heading text-3xl tracking-widest">WEEKLY LIMIT REACHED</h1>
        <p className="text-white/70 text-base max-w-sm leading-relaxed">{capError}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 px-8 py-3.5 bg-brand-light text-brand-dark font-bold rounded-2xl hover:brightness-110 transition-all"
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  return (
    // Note: h-[100dvh] ensures mobile browsers don't cut off the input bar
    <main className="h-[100dvh] bg-brand-dark text-white font-sans flex flex-col relative overflow-hidden">

      {/* Ambient background glow */}
      <div className="absolute inset-0 opacity-40 pointer-events-none z-0">
        <div className={`absolute top-[20%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000 ${getOrbGlow()}`} />
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* HEADER (Always Visible) */}
      {/* --------------------------------------------------------------------------- */}
      <header className="relative z-20 px-6 pt-12 pb-4 flex items-center justify-between border-b border-white/5 bg-brand-dark/50 backdrop-blur-md">
        {isIdle ? (
          <Link href="/dashboard" className="flex flex-col opacity-90 hover:opacity-100 transition-opacity active:scale-95">
            <span className="font-logo font-bold tracking-widest text-sm text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-light" />
              COACH STRONG
            </span>
            <span className="text-brand-green font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              Ready
            </span>
          </Link>
        ) : (
          <button onClick={handleEndSession} className="flex flex-col opacity-90 hover:opacity-100 transition-opacity active:scale-95 text-left">
            <span className="font-logo font-bold tracking-widest text-sm text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-light" />
              COACH STRONG
            </span>
            <span className="text-brand-green font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              {isConnecting ? "Connecting..." : "Secure Connection"}
            </span>
          </button>
        )}

        {!isIdle && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1">
              <div className="font-heading text-xl tracking-wider text-brand-sand leading-none">{formatTime(timer)}</div>
              {remainingSeconds !== null && (
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                  {formatMinutes(remainingSeconds - timer)} left
                </span>
              )}
            </div>
            
            {/* If in Chat Mode, provide a quick way to switch back to Voice View or End Call */}
            {showTranscript && (
              <div className="flex items-center gap-2 pl-3 ml-2 border-l border-white/10">
                <button
                  onClick={() => { setShowTranscript(false); setIsTextMode(false); setMicMuted(false); }}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20"
                  title="Return to Voice"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button onClick={handleEndSession} className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600" title="End Session">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* --------------------------------------------------------------------------- */}
      {/* VIEW 1: IDLE / START SCREEN (Clean, simple choice) */}
      {/* --------------------------------------------------------------------------- */}
      {isIdle && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
          <h2 className="font-heading text-4xl tracking-widest mb-2 text-white">
            {isDiscovery ? "DISCOVERY INTERVIEW" : "CHECK IN"}
          </h2>
          <p className="text-white/60 text-sm text-center mb-10 max-w-xs">
            {isDiscovery
              ? "Your 10–15 minute discovery conversation with Coach Strong. Find somewhere quiet."
              : "How would you like to connect with Coach Strong today?"}
          </p>
          
          <div className="w-full max-w-sm space-y-4">
            <button
              onClick={() => startConversation("voice")}
              disabled={startingMode !== null}
              className="w-full bg-brand-light text-brand-dark font-bold text-sm tracking-widest uppercase py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_0_30px_rgba(5,171,196,0.3)] disabled:opacity-60 disabled:scale-100"
            >
              {startingMode === "voice" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
              {startingMode === "voice" ? "Connecting..." : "Voice Call"}
            </button>
            <button
              onClick={() => startConversation("text")}
              disabled={startingMode !== null}
              className="w-full bg-white/5 border border-white/10 text-white font-bold text-sm tracking-widest uppercase py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {startingMode === "text" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Keyboard className="w-5 h-5" />}
              {startingMode === "text" ? "Connecting..." : "Text Chat"}
            </button>
          </div>
          
          <button
            onClick={() => router.push(isDiscovery ? "/discovery" : "/dashboard")}
            disabled={startingMode !== null}
            className="mt-10 text-brand-grey text-sm font-bold tracking-widest uppercase underline underline-offset-4 hover:text-white transition-colors disabled:pointer-events-none disabled:opacity-0"
          >
            Cancel & Return
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------------- */}
      {/* VIEW 2: VOICE MODE (Giant Orb, clean screen, big bottom controls) */}
      {/* --------------------------------------------------------------------------- */}
      {!isIdle && !showTranscript && (
        <>
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
            {/* The Giant Orb */}
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
              <div className="absolute inset-0 border border-white/10 rounded-full" />
              <div className="absolute inset-4 border border-white/5 rounded-full" />

              <div className={`absolute inset-0 bg-brand-light/20 rounded-full transition-all duration-700 ${isSpeaking ? "scale-[1.5] opacity-50 blur-xl" : "scale-100 opacity-0 blur-md"}`} />
              <div className={`absolute inset-0 bg-brand-mid/40 rounded-full transition-all duration-500 delay-75 ${isSpeaking ? "scale-[1.2] opacity-80 blur-lg animate-pulse" : "scale-100 opacity-0 blur-md"}`} />

              <div className={`relative z-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-700 ${
                isSpeaking
                  ? "bg-gradient-to-tr from-brand-light to-[#0de0ff] shadow-[0_0_60px_rgba(5,171,196,0.6)]"
                  : "bg-gradient-to-tr from-brand-mid to-brand-dark shadow-[0_0_30px_rgba(40,97,129,0.3)] border border-brand-light/30"
              }`}>
                {isConnecting ? (
                  <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-brand-light animate-spin" />
                ) : (
                  <Image
                    src="/Logo_square_OG.png"
                    alt="Inspire Change"
                    width={60}
                    height={60}
                    className={`brightness-0 invert transition-all duration-300 ${isSpeaking ? "scale-110" : "scale-100 opacity-70"}`}
                  />
                )}
              </div>
            </div>

            <p className={`mt-6 sm:mt-10 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${error ? "text-red-400" : "text-brand-light/70"}`}>
              {error || (isConnecting ? "Establishing link..." : isSpeaking ? "Coach Strong is speaking" : micMuted ? "Mic Muted" : "Listening...")}
            </p>
          </div>

          {/* Voice Mode Bottom Controls */}
          <div className="relative z-20 p-4 pb-8 sm:p-8 sm:pb-12 flex items-center justify-center gap-6">
            <button onClick={() => setMicMuted((m) => !m)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${micMuted ? "bg-white/20 text-white" : "bg-white text-brand-dark shadow-[0_0_20px_rgba(255,255,255,0.2)]"}`}>
              {micMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            <button onClick={handleEndSession} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:bg-red-600 active:scale-95 transition-all">
              <X className="w-10 h-10" />
            </button>
            <button onClick={() => setShowTranscript(true)} className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>
        </>
      )}

      {/* --------------------------------------------------------------------------- */}
      {/* VIEW 3: CHAT MODE (Messages list + Chat Input bar) */}
      {/* --------------------------------------------------------------------------- */}
      {!isIdle && showTranscript && (
        <div className="relative z-10 flex-1 flex flex-col min-h-0 bg-brand-dark/30 backdrop-blur-sm">
          
          {/* Scrollable Chat History */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-sm gap-2">
                <MessageSquare className="w-6 h-6 opacity-50" />
                <p>Messages will appear here</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-5 py-3 rounded-3xl text-[15px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand-light text-brand-dark font-medium rounded-br-sm"
                    : "bg-white/10 text-white font-light rounded-bl-sm border border-white/5"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} className="h-4" />
          </div>

          {/* Chat Input Footer */}
          <form onSubmit={handleSendText} className="p-4 bg-brand-dark border-t border-white/5 flex items-end gap-3 pb-8">

            {/* Quick Mic Toggle Button */}
            <button
              type="button"
              onClick={() => setMicMuted((m) => !m)}
              className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                micMuted ? "bg-white/10 text-white/50" : "bg-white text-brand-dark shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              }`}
            >
              {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Input Field */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                disabled={!isConnected}
                // fontSize 16px prevents iOS Safari from automatically zooming in on the input
                style={{ fontSize: "16px" }}
                className="w-full bg-white/10 border border-white/10 text-white placeholder-white/40 rounded-[2rem] pl-5 pr-12 py-3.5 focus:outline-none focus:border-brand-light/50 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || !isConnected}
                className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-brand-light rounded-full flex items-center justify-center text-brand-dark disabled:opacity-30 disabled:bg-white/20 disabled:text-white/50 transition-all"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}

    </main>
  );
}