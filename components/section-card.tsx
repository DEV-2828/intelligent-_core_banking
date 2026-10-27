import type { ReactNode } from "react";

export function SectionCard({ title, eyebrow, action, children, className = "" }: {
  title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`glass rounded-[24px] p-5 md:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-cyan-300/70">{eyebrow}</p>}
          <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
