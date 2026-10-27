export function Badge({ value }: { value: string }) {
  const v = value.toLowerCase();
  const tone =
    v.includes("active") || v.includes("approved") || v.includes("completed") || v === "low" || v.includes("verified")
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : v.includes("pending") || v.includes("review") || v.includes("moderate")
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : v.includes("reject") || v.includes("default") || v.includes("high") || v.includes("frozen")
          ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
          : "border-slate-400/20 bg-slate-400/10 text-slate-300";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] ${tone}`}>{value.replaceAll("_", " ")}</span>;
}
