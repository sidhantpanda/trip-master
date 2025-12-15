import { z } from "zod";

export const healthSchema = z.object({
  ok: z.literal(true)
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const authRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required")
});

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required")
});

export const authResponseSchema = z.object({
  user: userSchema
});

export type HealthResponse = z.infer<typeof healthSchema>;
export type UserDTO = z.infer<typeof userSchema>;
export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
