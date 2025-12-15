import mongoose, { Schema, Types } from "mongoose";
import {
  Trip,
  TripDay,
  TripItem,
  Collaborator,
  TripRoute,
  TripLocation,
  TripLink
} from "@trip-master/shared";

interface TripItemSubdoc extends Types.Subdocument {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  category?: string;
  startTime?: string;
  endTime?: string;
  location?: TripLocation;
  links?: TripLink[];
  notes?: string;
}

interface TripDaySubdoc extends Types.Subdocument {
  _id: Types.ObjectId;
  dayIndex: number;
  date: Date;
  items: Types.DocumentArray<TripItemSubdoc>;
  routes?: TripRoute;
}

interface CollaboratorSubdoc extends Types.Subdocument {
  userId: Types.ObjectId;
  email: string;
  role: "editor" | "viewer";
  invitedAt: Date;
  acceptedAt?: Date;
}

export interface TripDocument extends mongoose.Document {
  title: string;
  destination: string;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  ownerUserId: Types.ObjectId;
  collaborators: Types.DocumentArray<CollaboratorSubdoc>;
  days: Types.DocumentArray<TripDaySubdoc>;
  createdAt: Date;
  updatedAt: Date;
}

const linkSchema = new Schema<TripLink>(
  {
    label: { type: String, required: true },
    url: { type: String, required: true }
  },
  { _id: false }
);

const locationSchema = new Schema<TripLocation>(
  {
    name: String,
    address: String,
    placeId: String,
    lat: Number,
    lng: Number
  },
  { _id: false }
);

const itemSchema = new Schema<TripItemSubdoc>(
  {
    title: { type: String, required: true },
    description: String,
    category: String,
    startTime: String,
    endTime: String,
    location: locationSchema,
    links: [linkSchema],
    notes: String
  },
  { _id: true }
);

const routesSchema = new Schema<TripRoute>(
  {
    mode: String,
    polyline: String,
    distanceMeters: Number,
    durationSeconds: Number
  },
  { _id: false }
);

const daySchema = new Schema<TripDaySubdoc>(
  {
    dayIndex: { type: Number, required: true },
    date: { type: Date, required: true },
    items: [itemSchema],
    routes: routesSchema
  },
  { _id: true }
);

const collaboratorSchema = new Schema<CollaboratorSubdoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ["editor", "viewer"], required: true },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const tripSchema = new Schema<TripDocument>(
  {
    title: { type: String, required: true },
    destination: { type: String, required: true },
    startDate: Date,
    endDate: Date,
    timezone: String,
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    collaborators: [collaboratorSchema],
    days: [daySchema]
  },
  { timestamps: true }
);

tripSchema.index({ ownerUserId: 1 });
tripSchema.index({ "collaborators.userId": 1 });

export const TripModel = mongoose.model<TripDocument>("Trip", tripSchema);

export function toTripDTO(trip: TripDocument): Trip {
  const days: TripDay[] = (trip.days ?? []).map((day) => ({
    id: day._id?.toString(),
    dayIndex: day.dayIndex,
    date: day.date.toISOString(),
    items: (day.items ?? []).map((item) => ({
      id: item._id?.toString(),
      title: item.title,
      description: item.description,
      category: item.category,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location,
      links: item.links,
      notes: item.notes
    })),
    routes: day.routes
  }));

  const collaborators: Collaborator[] = (trip.collaborators ?? []).map((collab) => ({
    userId: collab.userId.toString(),
    email: collab.email,
    role: collab.role,
    invitedAt: collab.invitedAt.toISOString(),
    acceptedAt: collab.acceptedAt?.toISOString()
  }));

  return {
    id: trip._id.toString(),
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate?.toISOString(),
    endDate: trip.endDate?.toISOString(),
    timezone: trip.timezone,
    ownerUserId: trip.ownerUserId.toString(),
    collaborators,
    days,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString()
  };
}
