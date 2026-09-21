import React from "react";

export default class AppCrashBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetting: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("SyncWorks app shell error", error, info);
  }

  async resetShell() {
    this.setState({ resetting: true });
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // Recovery must continue even if browser cache APIs are unavailable.
    }
    window.location.replace(`/login?recover=${Date.now()}`);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const message = String(this.state.error?.message || this.state.error || "Unknown app error");
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#020617] px-4 text-slate-100">
        <section className="w-full max-w-md rounded-[1.75rem] border border-cyan-400/20 bg-slate-950/90 p-5 shadow-2xl">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">SyncWorks recovery</div>
          <h1 className="mt-2 text-xl font-black text-white">The app shell hit an error.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Your account is still intact. Reset the web-app shell and reopen the secure login.</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-5 text-slate-500 break-words">{message}</div>
          <button type="button" onClick={() => this.resetShell()} disabled={this.state.resetting} className="mt-4 h-12 w-full rounded-2xl bg-cyan-400 px-4 text-sm font-black text-slate-950 disabled:opacity-60">
            {this.state.resetting ? "Resetting…" : "Reset app shell"}
          </button>
        </section>
      </main>
    );
  }
}
