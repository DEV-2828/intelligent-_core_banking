"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="grid min-h-screen place-items-center p-6"><div className="glass max-w-lg rounded-[26px] p-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-rose-400/15 bg-rose-400/[.06] text-rose-300"><AlertTriangle size={25}/></div><h1 className="mt-5 text-2xl font-semibold text-white">Something interrupted the banking workspace</h1><p className="mt-2 text-sm leading-6 text-slate-500">Check that MySQL and MongoDB are running and that your environment values are correct.</p><button onClick={reset} className="btn-primary mt-6 inline-flex items-center gap-2"><RefreshCw size={15}/> Try again</button></div></main>;
}
