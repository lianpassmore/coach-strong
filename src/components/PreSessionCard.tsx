"use client";
import { useState } from "react";
import { Video, X, ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  sessionTopic: string | null;
  sessionPrepText: string | null;
  zoomLink: string | null;
};

export default function PreSessionCard({ sessionTopic, sessionPrepText, zoomLink }: Props) {
  // Show on Wednesday (3) and Thursday (4) NZ time
  const dayNZ = new Date().toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long" });
  const isPreSessionDay = dayNZ === "Wednesday" || dayNZ === "Thursday";

  const [dismissed, setDismissed] = useState(false);

  // Only show if Eske has populated session topic
  if (!isPreSessionDay || dismissed || !sessionTopic) return null;

  const isThursday = dayNZ === "Thursday";

  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-light/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-light/10 rounded-xl flex items-center justify-center">
            <Video className="w-4 h-4 text-brand-light" />
          </div>
          <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">
            {isThursday ? "SESSION TONIGHT" : "SESSION TOMORROW"}
          </h2>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-xl hover:bg-brand-sand transition-colors text-brand-grey"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm font-bold text-brand-dark mb-3">{sessionTopic}</p>

      {sessionPrepText && (
        <div className="bg-brand-sand rounded-xl p-3 mb-3 space-y-1.5">
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider">Have ready</p>
          {sessionPrepText.split("\n").filter(Boolean).map((line, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-brand-dark">
              <span className="text-brand-light font-bold shrink-0">·</span>
              {line.replace(/^[-•·]\s*/, "")}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {zoomLink ? (
          <a
            href={zoomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#2D8CFF] text-white font-bold text-sm rounded-xl"
          >
            <Video className="w-4 h-4" />
            {isThursday ? "Join tonight" : "Join tomorrow"}
          </a>
        ) : (
          <Link
            href="/workbook"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-dark text-white font-bold text-sm rounded-xl"
          >
            View workbook <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </section>
  );
}
