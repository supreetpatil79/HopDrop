import { Component, ReactNode } from 'react';
import { captureClientError } from '../telemetry';
import { Button, Card } from '../ui';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    captureClientError(error, {
      source: 'react_error_boundary',
      component_stack: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mx-auto max-w-2xl border-red-100 bg-white/95 text-center" padding="lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-700">!</div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We hit an unexpected problem while loading this page. Reload to reconnect and keep going.
          </p>
          <div className="mt-6 flex justify-center">
            <Button type="button" variant="secondary" onClick={this.handleRetry}>
              Retry
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
