"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, Building2, ChevronRight, Landmark, LayoutDashboard, LogOut, Menu, ShieldCheck, Sparkles, WalletCards, X } from "lucide-react";
import type { SessionUser } from "@/lib/types";

const nav = {
  customer: [
    { href: "/dashboard/customer", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/customer/transfer", label: "Payments", icon: WalletCards },
    { href: "/dashboard/customer/financials", label: "Financial profile", icon: Landmark },
    { href: "/dashboard/customer/loans", label: "Credit & loans", icon: Landmark },
  ],
  loan_officer: [
    { href: "/dashboard/officer", label: "Underwriting", icon: LayoutDashboard },
  ],
  risk_admin: [
    { href: "/dashboard/admin", label: "Risk command", icon: ShieldCheck },
  ],
};

export function DashboardShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const items = nav[user.role];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-50 w-[270px] border-r border-slate-700/20 bg-[#07111f]/95 px-4 py-5 backdrop-blur-xl transition-transform lg:translate-x-0 ${mobile ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <Link href={items[0].href} className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-[#05101c] shadow-[0_8px_30px_rgba(66,211,255,.18)]"><Building2 size={20} strokeWidth={2.4} /></div>
            <div><div className="font-bold tracking-tight text-white">Aurelis Bank</div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-300/60">Intelligence Core</div></div>
          </Link>
          <button className="lg:hidden" onClick={() => setMobile(false)}><X size={20} /></button>
        </div>

        <div className="mt-9 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">Workspace</div>
        <nav className="mt-2 space-y-1.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return <Link key={href} href={href} onClick={() => setMobile(false)} className={`group flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm transition ${active ? "border border-cyan-300/12 bg-cyan-300/[.07] text-cyan-100" : "text-slate-400 hover:bg-white/[.035] hover:text-slate-200"}`}>
              <span className="flex items-center gap-3"><Icon size={18} className={active ? "text-cyan-300" : "text-slate-600 group-hover:text-slate-400"} />{label}</span>
              {active && <ChevronRight size={14} className="text-cyan-300/70" />}
            </Link>;
          })}
        </nav>

        <div className="absolute inset-x-4 bottom-5">
          <div className="mb-3 rounded-2xl border border-cyan-300/10 bg-gradient-to-br from-cyan-300/[.06] to-blue-500/[.03] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200"><Sparkles size={14} /> Live risk fabric</div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">MySQL ledger and MongoDB credit intelligence synchronized through the application layer.</p>
          </div>
          <button onClick={logout} className="flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-sm text-slate-500 transition hover:bg-rose-400/[.06] hover:text-rose-300"><span className="flex items-center gap-3"><LogOut size={17} /> Sign out</span></button>
        </div>
      </aside>

      {mobile && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobile(false)} />}

      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-slate-700/15 bg-[#07111f]/72 px-4 backdrop-blur-xl md:px-7">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobile(true)} className="rounded-xl border border-slate-700/30 p-2 text-slate-400 lg:hidden"><Menu size={18} /></button>
            <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-600">Secure session</p><p className="text-sm font-semibold text-slate-200">{user.firstName} {user.lastName}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[.05] px-3 py-1.5 text-[11px] font-semibold text-emerald-300 sm:flex"><Activity size={13} /> Systems operational</div>
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700/30 bg-slate-800/60 text-xs font-bold text-cyan-200">{user.firstName[0]}{user.lastName[0]}</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1540px] p-4 md:p-7">{children}</main>
      </div>
    </div>
  );
}
