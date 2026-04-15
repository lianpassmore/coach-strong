"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Menu, X, User, MessageCircle, Mail, Phone, BookOpen,
  TrendingUp, Settings, LogOut, LayoutDashboard,
  CalendarDays, PenLine, Library, ChevronRight, Zap, Loader2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AppMenu() {
  const router = useRouter();
  const supabase = createClient();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const [fullName, setFullName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [disruptionMode, setDisruptionMode] = useState(false);
  const [togglingDisruption, setTogglingDisruption] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? null);

      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("full_name, is_admin, disruption_mode")
        .eq("id", user.id)
        .single();
      setFullName(data?.full_name ?? null);
      setIsAdmin(data?.is_admin ?? false);
      setDisruptionMode(data?.disruption_mode ?? false);

      const { data: urlData } = supabase.storage
        .from("profile_pictures")
        .getPublicUrl(`${user.id}/avatar`);
      try {
        const res = await fetch(urlData.publicUrl, { method: "HEAD" });
        if (res.ok) setAvatarUrl(urlData.publicUrl);
      } catch { /* no avatar */ }
    }
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const closeMenu = () => setIsMenuOpen(false);

  async function toggleDisruptionMode() {
    if (!userId) return;
    setTogglingDisruption(true);
    const next = !disruptionMode;
    setDisruptionMode(next);
    await supabase.from("profiles").update({ disruption_mode: next }).eq("id", userId);
    setTogglingDisruption(false);
  }

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsMenuOpen(true)}
        className="relative z-10 p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl hover:bg-white/20 transition-all active:scale-95"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Slide-out Menu */}
      {createPortal(
        <div className={`fixed inset-0 z-9999 ${isMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
          <div
            className={`absolute inset-0 bg-brand-dark/40 backdrop-blur-sm transition-opacity duration-300 ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeMenu}
          />

          <div className={`absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-400 ease-out flex flex-col ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
            
            {/* Header */}
            <div className="px-6 pt-12 pb-6 flex justify-between items-center">
              <Image src="/Logo_landscape_OG.png" alt="Inspire Change" width={110} height={34} />
              <button onClick={closeMenu} className="p-2 bg-brand-sand rounded-full text-brand-grey hover:text-brand-dark transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto px-6 pb-8">
              
              {/* Profile Card */}
              <div className="bg-brand-sand/50 rounded-3xl p-4 flex items-center gap-4 mb-8">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-brand-light shadow-sm overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-brand-grey" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-brand-dark truncate">{fullName ?? "My Account"}</h3>
                  <Link href="/profile" onClick={closeMenu} className="text-[10px] font-black uppercase text-brand-light tracking-widest hover:underline">
                    Edit Goals & Profile
                  </Link>
                </div>
              </div>

              {/* SECTION 1: THE DAILY PATH */}
              <div className="mb-8">
                <p className="text-[10px] font-black text-brand-grey uppercase tracking-[0.2em] mb-3 px-2">The Daily Path</p>
                <div className="space-y-1">
                  <MenuLink onClick={closeMenu} href="/dashboard" icon={<LayoutDashboard />} label="My Dashboard" />
                  <MenuLink onClick={closeMenu} href="/planner" icon={<CalendarDays />} label="Week Planner" />
                  <MenuLink onClick={closeMenu} href="/journal" icon={<PenLine />} label="My Journal" />

                  {/* Disruption Mode inline toggle */}
                  <button
                    onClick={toggleDisruptionMode}
                    disabled={togglingDisruption}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                      disruptionMode ? "bg-yellow-50 text-yellow-700" : "text-brand-dark hover:bg-brand-sand"
                    }`}
                  >
                    <span className={`shrink-0 ${disruptionMode ? "text-yellow-500" : "text-brand-light"}`}>
                      <Zap className="w-5 h-5" />
                    </span>
                    <span className="flex-1 font-bold text-sm tracking-wide text-left">Disruption Mode</span>
                    <span className={`relative w-10 h-6 rounded-full transition-colors duration-300 shrink-0 ${disruptionMode ? "bg-yellow-400" : "bg-brand-grey/30"}`}>
                      {togglingDisruption ? (
                        <Loader2 className="absolute inset-0 m-auto w-3 h-3 animate-spin text-white" />
                      ) : (
                        <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${disruptionMode ? "translate-x-4" : "translate-x-0"}`} />
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {/* SECTION 2: THE VAULT */}
              <div className="mb-8">
                <p className="text-[10px] font-black text-brand-grey uppercase tracking-[0.2em] mb-3 px-2">Growth Vault</p>
                <div className="space-y-1">
                  <MenuLink onClick={closeMenu} href="/workbook" icon={<BookOpen />} label="Digital Workbook" />
                  <MenuLink onClick={closeMenu} href="/journey" icon={<TrendingUp />} label="My Progress" />
                  <MenuLink onClick={closeMenu} href="/resources" icon={<Library />} label="Reference Cards" />
                </div>
              </div>

              {/* SECTION 3: SUPPORT */}
              <div>
                <p className="text-[10px] font-black text-brand-grey uppercase tracking-[0.2em] mb-3 px-2">Support</p>
                <div className="space-y-1">
                  <button
                    onClick={() => { closeMenu(); setIsContactOpen(true); }}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-brand-dark hover:bg-brand-sand transition-all font-bold text-sm"
                  >
                    <MessageCircle className="w-5 h-5 text-brand-light shrink-0" />
                    Contact Eske
                  </button>
                  <MenuLink onClick={closeMenu} href="/settings" icon={<Settings />} label="App Settings" />
                  
                  {isAdmin && (
                    <div className="pt-4 mt-4 border-t border-brand-sand">
                      <MenuLink onClick={closeMenu} href="/admin" icon={<LayoutDashboard />} label="Coach Admin" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer / Logout */}
            <div className="p-6 border-t border-brand-sand flex items-center justify-between">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-500 font-bold text-sm hover:opacity-70 transition-opacity"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
              <a href="mailto:support@dreamstorm.org" className="text-[10px] text-brand-grey font-medium">
                Tech Support
              </a>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Contact Eske Modal */}
      {isContactOpen && createPortal(
        <div className="fixed inset-0 z-9999 flex items-end justify-center">
          <div className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" onClick={() => setIsContactOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-[2.5rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="w-12 h-1.5 bg-brand-sand rounded-full mx-auto mb-6" />
            <h2 className="font-heading text-2xl text-brand-dark tracking-wider mb-6">CONTACT ESKE</h2>
            <div className="space-y-3">
              <a href="https://wa.me/642633564" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between p-5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 text-brand-dark font-bold">
                <div className="flex items-center gap-4">
                  <Phone className="w-5 h-5 text-[#25D366]" />
                  WhatsApp
                </div>
                <ChevronRight className="w-4 h-4 opacity-30" />
              </a>
              <a href="mailto:eske@inspirechange.nz" className="w-full flex items-center justify-between p-5 rounded-2xl bg-brand-sand border border-brand-dark/5 text-brand-dark font-bold">
                <div className="flex items-center gap-4">
                  <Mail className="w-5 h-5 text-brand-light" />
                  Email Eske
                </div>
                <ChevronRight className="w-4 h-4 opacity-30" />
              </a>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-brand-dark hover:bg-brand-sand transition-all group"
    >
      <div className="flex items-center gap-4">
        <span className="text-brand-light group-hover:scale-110 transition-transform">
          {Object.assign({}, icon as any, { props: { ... (icon as any).props, className: "w-5 h-5" } })}
        </span>
        <span className="font-bold text-sm tracking-wide">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-20 transition-opacity" />
    </Link>
  );
}