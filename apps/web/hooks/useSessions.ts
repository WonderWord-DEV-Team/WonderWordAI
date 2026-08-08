"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeReadingSession,
  createReadingSession,
  getReadingSession,
  listSessions
} from "@/lib/sessions/client";
import { sessionQueryKeys, type SessionFilters } from "@/lib/sessions/keys";

export function useSessions(filters?: SessionFilters) {
  return useQuery({
    queryKey: sessionQueryKeys.list(filters),
    queryFn: () => listSessions(filters)
  });
}

export function useOpenSessions() {
  return useSessions({ status: "open" });
}

export function useSession(sessionId: string | null) {
  return useQuery({
    queryKey: [...sessionQueryKeys.all, "detail", sessionId],
    queryFn: () => getReadingSession(sessionId ?? ""),
    enabled: Boolean(sessionId)
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...sessionQueryKeys.all, "create"],
    mutationFn: createReadingSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKeys.lists() });
    }
  });
}

export function useCloseSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...sessionQueryKeys.all, "close"],
    mutationFn: closeReadingSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKeys.lists() });
    }
  });
}
