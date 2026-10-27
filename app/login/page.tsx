import { redirect } from "next/navigation";
import { Activity, Database, Fingerprint, Gauge, Landmark, ShieldCheck } from "lucide-react";
import { dashboardForRole, getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(dashboardForRole(user.role));

  return <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-8">
    <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-cyan-400/10 blur-[100px]" />
    <div className="absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-blue-500/10 blur-[110px]" />
    <div className="grid w-full max-w-[1120px] overflow-hidden rounded-[30px] border border-slate-700/20 bg-[#0a1727]/70 shadow-[0_35px_120px_rgba(0,0,0,.4)] backdrop-blur-2xl lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden min-h-[680px] overflow-hidden border-r border-slate-700/20 p-10 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(66,211,255,.12),transparent_32%),radial-gradient(circle_at_90%_80%,rgba(91,140,255,.13),transparent_35%)]" />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-[#06111d]"><Landmark size={21}/></div><div><h1 className="font-bold tracking-tight text-white">Aurelis Bank</h1><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-300/60">Intelligence Core</p></div></div>
          <div className="my-auto max-w-lg"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/10 bg-cyan-300/[.05] px-3 py-1.5 text-[11px] font-semibold text-cyan-200"><Activity size={13}/> Hybrid banking fabric online</div><h2 className="text-5xl font-semibold leading-[1.04] tracking-[-.04em] text-white">Banking operations.<br/><span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-400 bg-clip-text text-transparent">Credit intelligence.</span><br/>One control plane.</h2><p className="mt-5 max-w-md text-sm leading-6 text-slate-400">A full-stack core banking prototype combining an ACID MySQL ledger with MongoDB-powered commercial risk analytics.</p>
            <div className="mt-8 grid grid-cols-2 gap-3"><Feature icon={Database} title="ACID ledger" text="Locked transfers & immutable audit"/><Feature icon={Gauge} title="Risk engine" text="DSCR, OCF & composite scoring"/><Feature icon={Fingerprint} title="Role security" text="Customer, officer & admin RBAC"/><Feature icon={ShieldCheck} title="Integrity first" text="Triggers, constraints & validation"/></div>
          </div>
          <p className="text-[11px] text-slate-600">DBMS academic prototype · Secure systems demonstration</p>
        </div>
      </section>
      <section className="flex min-h-[650px] items-center p-6 sm:p-10 lg:p-12"><div className="mx-auto w-full max-w-[410px]"><div className="lg:hidden mb-10 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-[#06111d]"><Landmark size={19}/></div><b>Aurelis Bank</b></div><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300/70">Secure access</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.03em] text-white">Welcome back</h2><p className="mt-2 text-sm text-slate-500">Sign in to your role-specific banking workspace.</p><LoginForm/><div className="mt-6 rounded-2xl border border-slate-700/25 bg-slate-950/25 p-4"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-600">Demo accounts after npm run seed:passwords</p><div className="mt-3 grid gap-2 text-[11px] text-slate-500"><p><b className="text-slate-300">Customer:</b> arjun@example.com / Customer@123</p><p><b className="text-slate-300">Officer:</b> officer@example.com / Officer@123</p><p><b className="text-slate-300">Admin:</b> admin@example.com / Admin@123</p></div></div></div></section>
    </div>
  </main>;
}

function Feature({ icon: Icon, title, text }: { icon: any; title: string; text: string }) { return <div className="rounded-2xl border border-slate-700/20 bg-slate-900/25 p-4"><Icon size={17} className="text-cyan-300"/><p className="mt-3 text-xs font-semibold text-slate-200">{title}</p><p className="mt-1 text-[10px] leading-4 text-slate-600">{text}</p></div>; }
