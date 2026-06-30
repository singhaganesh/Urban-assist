'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [c] = React.useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }));
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>;
}
