'use client';

import React, { Suspense } from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border bg-red-50 p-4 text-red-700">
          Something went wrong. Please retry.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AsyncBoundary({ children, fallback }: Props) {
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback ?? <div className="p-4">Loading…</div>}>{children}</Suspense>
    </ErrorBoundary>
  );
}
