"use client";
export function PrintButton() { return <button className="btn-secondary text-xs print:hidden" onClick={() => window.print()}>Print schedule</button>; }
