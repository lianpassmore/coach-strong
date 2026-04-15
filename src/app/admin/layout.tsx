import { Monitor } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop gate: hidden on md+ screens, shown on mobile/tablet */}
      <div className="md:hidden min-h-screen bg-brand-dark flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
          <Monitor className="w-10 h-10 text-brand-light" />
        </div>
        <div>
          <h1 className="font-heading text-3xl tracking-widest text-white mb-2">COACH STRONG</h1>
          <p className="text-brand-light font-bold text-sm uppercase tracking-wider mb-3">Admin Dashboard</p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            The coach dashboard is designed for desktop use. Please open this page on your laptop or desktop computer.
          </p>
        </div>
        <p className="text-white/30 text-xs">coach@dreamstorm.org for support</p>
      </div>

      {/* Show dashboard on md+ */}
      <div className="hidden md:block">
        {children}
      </div>
    </>
  );
}
