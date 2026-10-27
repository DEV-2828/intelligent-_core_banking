"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Unable to sign in");
    router.replace(data.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Email address</span><div className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" /><input className="input pl-11" name="email" type="email" placeholder="you@bank.com" required /></div></label>
      <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Password</span><div className="relative"><LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" /><input className="input px-11" name="password" type={show ? "text" : "password"} placeholder="••••••••••" required /><button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300" onClick={() => setShow(!show)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
      {error && <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3.5 py-3 text-xs text-rose-300">{error}</div>}
      <button disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 py-3.5">{loading ? <Loader2 size={17} className="animate-spin" /> : <>Enter secure workspace <ArrowRight size={16} /></>}</button>
    </form>
  );
}
