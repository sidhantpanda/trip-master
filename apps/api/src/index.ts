import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { healthSchema, HealthResponse } from "@trip-master/shared";
import { env } from "./config/env";
import authRouter from "./routes/auth";

const app = express();

app.use(
  cors({
    origin: env.appBaseUrl,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  const payload: HealthResponse = { ok: true };
  res.json(healthSchema.parse(payload));
});

app.use("/auth", authRouter);

async function start() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");

    app.listen(env.port, () => {
      console.log(`API server listening on port ${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start API server", err);
    process.exit(1);
  }
}

start();
