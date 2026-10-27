"use client";
import { Component, type ReactNode } from "react";

/** Contains a render error to one card instead of blanking the whole dashboard. */
export default class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[PM Job Radar] a posting failed to render", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
