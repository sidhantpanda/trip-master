import { z } from "zod";

export const healthSchema = z.object({
  ok: z.literal(true)
});

export const tripLinkSchema = z.object({
  label: z.string(),
  url: z.string().url()
});

export const tripLocationSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  placeId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional()
});

export const tripItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: tripLocationSchema.optional(),
  links: z.array(tripLinkSchema).optional(),
  notes: z.string().optional()
});

export const tripRouteSchema = z.object({
  mode: z.enum(["driving", "transit", "walking"]).optional(),
  polyline: z.string().optional(),
  distanceMeters: z.number().optional(),
  durationSeconds: z.number().optional()
});

export const tripDaySchema = z.object({
  id: z.string().optional(),
  dayIndex: z.number(),
  date: z.string(),
  items: z.array(tripItemSchema),
  routes: tripRouteSchema.optional()
});

export const collaboratorSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.enum(["owner", "editor", "viewer"]),
  invitedAt: z.string().datetime(),
  acceptedAt: z.string().datetime().optional()
});

const tripBaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  destination: z.string().min(1, "Destination is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timezone: z.string().optional()
});

const tripDayInputSchema = z.object({
  dayIndex: z.number().optional(),
  date: z.string(),
  items: z.array(tripItemSchema).optional(),
  routes: tripRouteSchema.optional()
});

export const tripSchema = tripBaseSchema.extend({
  id: z.string(),
  ownerUserId: z.string(),
  collaborators: z.array(collaboratorSchema),
  days: z.array(tripDaySchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const tripListSchema = z.array(tripSchema);

export const createTripSchema = tripBaseSchema.extend({
  days: z.array(tripDayInputSchema).optional()
});

export const updateTripSchema = tripBaseSchema.partial().extend({
  days: z.array(tripDayInputSchema).optional()
});

export const addCollaboratorSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"])
});

export const updateCollaboratorSchema = z.object({
  role: z.enum(["editor", "viewer"])
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
export type TripLink = z.infer<typeof tripLinkSchema>;
export type TripLocation = z.infer<typeof tripLocationSchema>;
export type TripItem = z.infer<typeof tripItemSchema>;
export type TripRoute = z.infer<typeof tripRouteSchema>;
export type TripDay = z.infer<typeof tripDaySchema>;
export type Trip = z.infer<typeof tripSchema>;
export type TripListResponse = z.infer<typeof tripListSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type Collaborator = z.infer<typeof collaboratorSchema>;
export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>;
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;
