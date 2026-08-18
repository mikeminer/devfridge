import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: string | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error: error.message || String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Fridge render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="app kitchen" style={{ padding: 24 }}>
            <div className="banner bad">{this.state.error}</div>
            <button
              className="primary"
              type="button"
              style={{ marginTop: 16, maxWidth: 280 }}
              onClick={() => {
                try {
                  localStorage.removeItem("fridge.rpc");
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
            >
              Reset RPC and reload
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
