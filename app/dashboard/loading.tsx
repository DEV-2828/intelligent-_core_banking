export default function Loading() {
  return <div className="space-y-6 animate-pulse"><div className="h-20 rounded-3xl bg-white/[.025]"/><div className="grid grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-32 rounded-3xl bg-white/[.025]"/>)}</div><div className="h-96 rounded-3xl bg-white/[.025]"/></div>;
}
