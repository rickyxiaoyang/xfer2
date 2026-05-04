import React from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center space-y-2 p-8">
            <p className="text-sm font-medium text-destructive">
              Something went wrong
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {this.state.error.message}
            </p>
            <button
              className="text-xs text-primary underline"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
