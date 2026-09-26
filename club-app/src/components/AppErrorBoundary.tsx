import { Component, type ReactNode } from "react";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-recovery" role="alert">
          <p className="eyebrow red">Dustin Courageous Adventure Club</p>
          <h1>Let’s get your adventure back</h1>
          <p>This page could not load. Reload it to try again. Any unsaved form entries may need to be entered again.</p>
          <button className="primary-button" onClick={() => window.location.reload()}>Reload Page</button>
        </main>
      );
    }
    return this.props.children;
  }
}
