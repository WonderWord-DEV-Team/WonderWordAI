"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";

const SERVER_STATE_STALE_TIME_MS = 60_000;

function shouldRetry(failureCount: number, error: Error) {
  if (failureCount >= 2) {
    return false;
  }

  if (error instanceof ApiError) {
    if (error.status >= 400 && error.status < 500) {
      return false;
    }

    return error.status >= 500;
  }

  return true;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: SERVER_STATE_STALE_TIME_MS,
            refetchOnWindowFocus: false,
            retry: shouldRetry
          },
          mutations: {
            retry: shouldRetry
          }
        }
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
