import { z } from "zod";

export const healthSchema = z.object({
  ok: z.literal(true)
});

export type HealthResponse = z.infer<typeof healthSchema>;
