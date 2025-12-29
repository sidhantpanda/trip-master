import { Router } from "express";
import mongoose, { Types } from "mongoose";
import {
  addCollaboratorSchema,
  createTripSchema,
  enrichTripSchema,
  generateItinerarySchema,
  routeTripSchema,
  tripListSchema,
  tripSchema,
  updateCollaboratorSchema,
  updateTripSchema
} from "@trip-master/shared";
import { TripModel, toTripDTO, TripDocument } from "../models/Trip";
import { UserModel } from "../models/User";
import { generateItineraryWithValidation } from "../services/itineraryGenerator";
import { computeTripRoutes, enrichTripPlaces } from "../services/tripMaps";
import { decryptSecret } from "../utils/encryption";
import { env } from "../config/env";

const router = Router();

function parseObjectId(id: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date;
}

function normalizeDays(
  daysInput: NonNullable<ReturnType<typeof createTripSchema.parse>["days"]>
) {
  return daysInput.map((day, idx) => ({
    dayIndex: day.dayIndex ?? idx,
    date: normalizeDate(day.date) as Date,
    items: (day.items ?? []).map((item) => {
      const mapped: any = {
        title: item.title,
        description: item.description,
        category: item.category,
        startTime: item.startTime,
        endTime: item.endTime,
        location: item.location,
        links: item.links,
        notes: item.notes
      };
      if (item.id) {
        mapped._id = parseObjectId(item.id) || item.id;
      }
      return mapped;
    }),
    routes: day.routes
  }));
}

function getUserRole(trip: TripDocument, userId: Types.ObjectId) {
  if (trip.ownerUserId.equals(userId)) {
    return "owner" as const;
  }
  const collab = trip.collaborators.find((c) => c.userId.equals(userId));
  return collab?.role ?? null;
}

router.get("/", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  if (!requesterId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const trips = await TripModel.find({
    $or: [{ ownerUserId: requesterId }, { "collaborators.userId": requesterId }]
  }).sort({ updatedAt: -1 });

  return res.json(tripListSchema.parse(trips.map(toTripDTO)));
});

router.post("/", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  if (!requesterId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = createTripSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.errors.at(0)?.message ?? "Invalid payload";
    return res.status(400).json({ error: firstError });
  }

  try {
    const trip = await TripModel.create({
      title: parsed.data.title,
      destination: parsed.data.destination,
      startDate: normalizeDate(parsed.data.startDate),
      endDate: normalizeDate(parsed.data.endDate),
      timezone: parsed.data.timezone,
      ownerUserId: requesterId,
      collaborators: [],
      days: parsed.data.days ? normalizeDays(parsed.data.days) : []
    });

    return res.status(201).json(tripSchema.parse(toTripDTO(trip)));
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid date") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Failed to create trip" });
  }
});

router.get("/:id", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  const tripId = parseObjectId(req.params.id);
  if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
  if (!tripId) return res.status(400).json({ error: "Invalid trip id" });

  const trip = await TripModel.findById(tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const role = getUserRole(trip, requesterId);
  if (!role) return res.status(403).json({ error: "Forbidden" });

  return res.json(tripSchema.parse(toTripDTO(trip)));
});

router.put("/:id", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  const tripId = parseObjectId(req.params.id);
  if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
  if (!tripId) return res.status(400).json({ error: "Invalid trip id" });

  const parsed = updateTripSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.errors.at(0)?.message ?? "Invalid payload";
    return res.status(400).json({ error: firstError });
  }

  try {
    const trip = await TripModel.findById(tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const role = getUserRole(trip, requesterId);
    if (role !== "owner" && role !== "editor") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (parsed.data.title !== undefined) trip.title = parsed.data.title;
    if (parsed.data.destination !== undefined) trip.destination = parsed.data.destination;
    if (parsed.data.startDate !== undefined) trip.startDate = normalizeDate(parsed.data.startDate);
    if (parsed.data.endDate !== undefined) trip.endDate = normalizeDate(parsed.data.endDate);
    if (parsed.data.timezone !== undefined) trip.timezone = parsed.data.timezone;
    if (parsed.data.days !== undefined) {
      trip.days = normalizeDays(parsed.data.days) as unknown as mongoose.Types.DocumentArray<any>;
    }

    await trip.save();
    return res.json(tripSchema.parse(toTripDTO(trip)));
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid date") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Failed to update trip" });
  }
});

router.delete("/:id", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  const tripId = parseObjectId(req.params.id);
  if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
  if (!tripId) return res.status(400).json({ error: "Invalid trip id" });

  const trip = await TripModel.findById(tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const role = getUserRole(trip, requesterId);
  if (role !== "owner") return res.status(403).json({ error: "Forbidden" });

  await trip.deleteOne();
  return res.status(204).end();
});

router.post("/:id/collaborators", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  const tripId = parseObjectId(req.params.id);
  if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
  if (!tripId) return res.status(400).json({ error: "Invalid trip id" });

  const parsed = addCollaboratorSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.errors.at(0)?.message ?? "Invalid payload";
    return res.status(400).json({ error: firstError });
  }

  const trip = await TripModel.findById(tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const role = getUserRole(trip, requesterId);
  if (role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const collaboratorUser = await UserModel.findOne({ email: parsed.data.email.toLowerCase() });
  if (!collaboratorUser) {
    return res.status(404).json({ error: "User not found" });
  }

  if (collaboratorUser._id.equals(trip.ownerUserId)) {
    return res.status(400).json({ error: "Owner already has access" });
  }

  const alreadyOnTrip = trip.collaborators.some((c) => c.userId.equals(collaboratorUser._id));
  if (alreadyOnTrip) {
    return res.status(409).json({ error: "Collaborator already added" });
  }

  trip.collaborators.push({
    userId: collaboratorUser._id,
    email: collaboratorUser.email,
    role: parsed.data.role,
    invitedAt: new Date(),
    acceptedAt: new Date()
  } as any);

  await trip.save();
  return res.status(201).json(tripSchema.parse(toTripDTO(trip)));
});

router.put("/:id/collaborators/:userId", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  const tripId = parseObjectId(req.params.id);
  const collaboratorUserId = parseObjectId(req.params.userId);
  if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
  if (!tripId || !collaboratorUserId) return res.status(400).json({ error: "Invalid id" });

  const parsed = updateCollaboratorSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.errors.at(0)?.message ?? "Invalid payload";
    return res.status(400).json({ error: firstError });
  }

  const trip = await TripModel.findById(tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const role = getUserRole(trip, requesterId);
  if (role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const collaborator = trip.collaborators.find((c) => c.userId.equals(collaboratorUserId));
  if (!collaborator) {
    return res.status(404).json({ error: "Collaborator not found" });
  }

  collaborator.role = parsed.data.role;
  await trip.save();
  return res.json(tripSchema.parse(toTripDTO(trip)));
});

router.delete("/:id/collaborators/:userId", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  const tripId = parseObjectId(req.params.id);
  const collaboratorUserId = parseObjectId(req.params.userId);
  if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
  if (!tripId || !collaboratorUserId) return res.status(400).json({ error: "Invalid id" });

  const trip = await TripModel.findById(tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const role = getUserRole(trip, requesterId);
  if (role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const existingCount = trip.collaborators.length;
  trip.collaborators = trip.collaborators.filter((c) => !c.userId.equals(collaboratorUserId)) as any;

  if (trip.collaborators.length === existingCount) {
    return res.status(404).json({ error: "Collaborator not found" });
  }

  await trip.save();
  return res.status(204).end();
});

router.post("/:id/generate-itinerary", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  const tripId = parseObjectId(req.params.id);
  if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
  if (!tripId) return res.status(400).json({ error: "Invalid trip id" });

  const parsed = generateItinerarySchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.errors.at(0)?.message ?? "Invalid payload";
    return res.status(400).json({ error: firstError });
  }

  const trip = await TripModel.findById(tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const role = getUserRole(trip, requesterId);
  if (role !== "owner" && role !== "editor") return res.status(403).json({ error: "Forbidden" });

  const user = await UserModel.findById(requesterId);
  const settings = user?.settings ?? { llmProvider: "mock" };
  const provider = settings.llmProvider || "mock";
  const model = settings.llmModel;
  let apiKey: string | undefined;
  const encryptedKey = (settings.encryptedApiKeys as Record<string, string | undefined> | undefined)?.[provider];
  if (encryptedKey) {
    try {
      apiKey = decryptSecret(encryptedKey);
    } catch {
      console.warn("Failed to decrypt API key for provider", provider);
    }
  }
  if (provider !== "mock" && !apiKey) {
    return res.status(400).json({ error: `API key required for provider ${provider}` });
  }

  const startDateIso = trip.startDate?.toISOString();
  const dayCount =
    trip.startDate && trip.endDate
      ? Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : Math.max(trip.days.length, 3);

  try {
    const generatedDays = await generateItineraryWithValidation(
      {
        provider,
        model,
        prompt: parsed.data.prompt,
        dayCount,
        startDate: startDateIso,
        destination: trip.destination,
        apiKey
      },
      1
    );

    trip.days = normalizeDays(
      generatedDays.map((day, idx) => ({
        ...day,
        dayIndex: day.dayIndex ?? idx,
        date: day.date
      }))
    ) as any;

    await trip.save();
    return res.json(tripSchema.parse(toTripDTO(trip)));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    const status = message.includes("not implemented") || message.includes("Unknown LLM provider") ? 400 : 500;
    return res.status(status).json({ error: message });
  }
});

router.post("/:id/enrich", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  const tripId = parseObjectId(req.params.id);
  if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
  if (!tripId) return res.status(400).json({ error: "Invalid trip id" });

  const parsed = enrichTripSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const firstError = parsed.error.errors.at(0)?.message ?? "Invalid payload";
    return res.status(400).json({ error: firstError });
  }

  const trip = await TripModel.findById(tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const role = getUserRole(trip, requesterId);
  if (role !== "owner" && role !== "editor") return res.status(403).json({ error: "Forbidden" });

  try {
    const result = await enrichTripPlaces(trip, env.googleMapsApiKey, parsed.data.dayIndex);
    if (result.updated) {
      trip.markModified("days");
      await trip.save();
    }
    return res.json(tripSchema.parse(toTripDTO(trip)));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed";
    return res.status(500).json({ error: message });
  }
});

router.post("/:id/route", async (req, res) => {
  const requesterId = parseObjectId(req.user?.userId || "");
  const tripId = parseObjectId(req.params.id);
  if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
  if (!tripId) return res.status(400).json({ error: "Invalid trip id" });

  const parsed = routeTripSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const firstError = parsed.error.errors.at(0)?.message ?? "Invalid payload";
    return res.status(400).json({ error: firstError });
  }

  const trip = await TripModel.findById(tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const role = getUserRole(trip, requesterId);
  if (role !== "owner" && role !== "editor") return res.status(403).json({ error: "Forbidden" });

  const mode = parsed.data.mode ?? "driving";
  try {
    const result = await computeTripRoutes(trip, env.googleMapsApiKey, {
      dayIndex: parsed.data.dayIndex,
      mode
    });
    if (result.updated) {
      trip.markModified("days");
      await trip.save();
    }
    return res.json(tripSchema.parse(toTripDTO(trip)));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Route computation failed";
    return res.status(500).json({ error: message });
  }
});

export default router;
