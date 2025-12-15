import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { healthSchema, HealthResponse } from "@trip-master/shared";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  const payload: HealthResponse = { ok: true };
  res.json(healthSchema.parse(payload));
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
