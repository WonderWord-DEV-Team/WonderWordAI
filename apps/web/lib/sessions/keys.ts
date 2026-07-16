import { z } from "zod";

export const sessionStatusSchema = z.enum(["open", "closed"]);

export const sessionFiltersSchema = z
  .object({
    status: sessionStatusSchema.optional(),
    limit: z.number().int().min(1).max(100).optional()
  })
  .optional();

export type SessionFilters = z.infer<typeof sessionFiltersSchema>;

export function normalizeSessionFilters(filters?: SessionFilters) {
  const parsed = sessionFiltersSchema.parse(filters);

  return {
    status: parsed?.status ?? null,
    limit: parsed?.limit ?? 20
  };
}

export const sessionQueryKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionQueryKeys.all, "list"] as const,
  list: (filters?: SessionFilters) =>
    [...sessionQueryKeys.lists(), normalizeSessionFilters(filters)] as const
};
