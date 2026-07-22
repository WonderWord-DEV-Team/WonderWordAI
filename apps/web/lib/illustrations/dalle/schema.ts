import { z } from "zod";

export const dalleResponseSchema = z.object({
  data: z.array(
    z.object({
      b64_json: z.string().optional(),
      url: z.string().optional()
    })
  )
});

export type DalleResponse = z.infer<typeof dalleResponseSchema>;
