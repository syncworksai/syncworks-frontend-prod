// src/components/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, err: error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-red-900/50 bg-red-950/30 text-red-200 p-4">
          <div className="font-extrabold">This panel crashed</div>
          <div className="text-sm mt-2">{this.state.err?.message || "Unknown error"}</div>
          <div className="text-xs mt-2 text-red-300">Open DevTools Console to see the stack trace.</div>
        </div>
      );
    }
    return this.props.children;
  }
}