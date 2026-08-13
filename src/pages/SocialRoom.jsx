import React from "react";
import ModeBar from "../components/ModeBar";

export default function SocialRoom() {
  return (
    <div className="min-h-screen bg-[#02060c] text-slate-100">
      <ModeBar title="Social Chat" subtitle="Shared group rooms" />
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-5">
        <section className="rounded-[1.75rem] border border-white/10 bg-[#07111f]/90 p-5">
          <h1 className="text-xl font-black text-white">Group communication</h1>
          <p className="mt-2 text-sm text-slate-400">Shared rooms for active group members and event coordination.</p>
        </section>
      </main>
    </div>
  );
}
