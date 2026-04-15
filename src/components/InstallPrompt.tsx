"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white rounded-xl shadow-lg p-4 flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-brand-dark">Add Coach Strong to your home screen</p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowPrompt(false)}
          className="text-xs text-gray-500 px-3 py-1 rounded-lg"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="text-xs bg-brand-blue text-white px-3 py-1 rounded-lg font-semibold"
        >
          Install
        </button>
      </div>
    </div>
  );
}
