"use client";
import { useState, useEffect } from "react";
import { Loader2, Search, BookOpen, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

type Card = {
  id: string;
  category: string;
  title: string;
  content: string;
};

export default function ResourcesPage() {
  const supabase = createClient();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("knowledge_base")
        .select("id, category, title, content")
        .eq("type", "reference_card")
        .eq("is_active", true)
        .order("sort_order")
        .order("category");
      setCards(data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = query.trim()
    ? cards.filter((c) =>
        [c.title, c.category, c.content].some((f) =>
          f.toLowerCase().includes(query.toLowerCase())
        )
      )
    : cards;

  // Group by category
  const groups = filtered.reduce<Record<string, Card[]>>((acc, card) => {
    (acc[card.category] ??= []).push(card);
    return acc;
  }, {});

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-sand pb-24 font-sans text-brand-dark">
      <header className="bg-linear-to-b from-brand-dark to-[#1a15a3] text-white pt-14 pb-20 px-6 rounded-b-4xl shadow-[0_10px_30px_rgba(17,12,148,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-mid/30 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <HomeButton />
            <p className="text-brand-light font-bold text-xs uppercase tracking-[0.2em] mb-1 mt-3">Quick lookup</p>
            <h1 className="font-heading text-4xl tracking-wider">REFERENCE CARDS</h1>
          </div>
          <AppMenu />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-10 space-y-4 relative z-10">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-grey" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards…"
            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey shadow-sm border border-brand-sand focus:border-brand-light focus:outline-none transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-grey"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {Object.keys(groups).length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-brand-sand mx-auto" />
            <p className="text-brand-grey font-bold text-sm">
              {query ? "No cards match your search." : "No reference cards yet."}
            </p>
            {!query && (
              <p className="text-brand-grey text-xs">Eske will add quick reference cards here.</p>
            )}
          </div>
        ) : (
          Object.entries(groups).map(([category, categoryCards]) => (
            <div key={category} className="space-y-2">
              <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider px-1">{category}</p>
              {categoryCards.map((card) => {
                const isOpen = expanded === card.id;
                return (
                  <div
                    key={card.id}
                    className="bg-white rounded-2xl shadow-sm border border-brand-sand overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(isOpen ? null : card.id)}
                      className="w-full p-4 text-left flex items-center gap-3 hover:bg-brand-sand/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-xl bg-brand-light/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-brand-light" />
                      </div>
                      <span className="flex-1 text-sm font-bold text-brand-dark">{card.title}</span>
                      <span className="text-brand-grey text-xs font-bold shrink-0">{isOpen ? "Close" : "View"}</span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="bg-brand-sand rounded-xl p-3">
                          <p className="text-sm text-brand-dark leading-relaxed whitespace-pre-wrap">{card.content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
