"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, BookOpen, X, ChevronDown, Sparkles, Library } from "lucide-react";import { createClient } from "@/lib/supabase/client";
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
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return cards;
    return cards.filter((c) =>
      [c.title, c.category, c.content].some((f) =>
        f.toLowerCase().includes(query.toLowerCase())
      )
    );
  }, [query, cards]);

  // Group by category
  const groups = useMemo(() => {
    return filtered.reduce<Record<string, Card[]>>((acc, card) => {
      (acc[card.category] ??= []).push(card);
      return acc;
    }, {});
  }, [filtered]);

  if (loading) return (
    <div className="min-h-screen bg-brand-sand flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
    </div>
  );

  return (
    <main className="min-h-screen bg-brand-sand pb-24 text-brand-dark overflow-x-hidden">
      
      {/* HEADER: The Knowledge Vault */}
      <header className="bg-brand-dark text-white pt-12 pb-14 px-6 rounded-b-[2.5rem] shadow-xl relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-mid/10 rounded-full blur-[60px]" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <HomeButton />
              <div>
                 <h1 className="font-heading text-3xl tracking-wider leading-none uppercase">The Vault</h1>
                 <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em] mt-1">
                   Quick Reference Wisdom
                 </p>
              </div>
            </div>
            <AppMenu />
          </div>

          {/* SEARCH BAR (Inside Header for better focus) */}
          <div className="relative mt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-grey" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search concepts, fuel, or habits..."
              className="w-full pl-11 pr-10 py-4 bg-white rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey/60 shadow-lg border-none focus:ring-2 focus:ring-brand-light focus:outline-none transition-all"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-grey">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-6 space-y-8 relative z-10">

        {Object.keys(groups).length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-brand-grey/10 rounded-full flex items-center justify-center mx-auto">
               <BookOpen className="w-8 h-8 text-brand-grey/30" />
            </div>
            <p className="text-brand-grey font-bold text-sm">
              {query ? "No cards match your search." : "The vault is being stocked."}
            </p>
          </div>
        ) : (
          Object.entries(groups).map(([category, categoryCards]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                 <div className="h-px bg-brand-grey/20 flex-1" />
                 <p className="text-[10px] font-black text-brand-grey uppercase tracking-[0.2em]">{category}</p>
                 <div className="h-px bg-brand-grey/20 flex-1" />
              </div>
              
              <div className="space-y-3">
                {categoryCards.map((card) => {
                  const isOpen = expanded === card.id;
                  return (
                    <div
                      key={card.id}
                      className={`bg-white rounded-3xl transition-all duration-300 border ${
                        isOpen ? "shadow-xl ring-1 ring-brand-light/20 border-brand-light/30" : "shadow-sm border-brand-sand"
                      }`}
                    >
                      <button
                        onClick={() => setExpanded(isOpen ? null : card.id)}
                        className="w-full p-5 text-left flex items-center gap-4 group"
                      >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                          isOpen ? "bg-brand-dark text-brand-green" : "bg-brand-sand text-brand-grey"
                        }`}>
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <span className="flex-1 text-sm font-bold text-brand-dark leading-tight">{card.title}</span>
                        <ChevronDown className={`w-5 h-5 text-brand-grey transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      
                      {isOpen && (
                        <div className="px-5 pb-6 pt-0 animate-in fade-in slide-in-from-top-2">
                          <div className="bg-brand-sand/50 rounded-2xl p-4 border border-brand-dark/5">
                            <p className="text-sm text-brand-dark leading-relaxed whitespace-pre-wrap">{card.content}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* AI CALL TO ACTION */}
        <div className="text-center py-10 px-6">
           <p className="text-xs text-brand-grey leading-relaxed">
             Need more context? <br />
             <span className="font-bold text-brand-light">Ask Coach Strong AI</span> about any of these concepts for a personalized breakdown.
           </p>
        </div>
      </div>
    </main>
  );
}