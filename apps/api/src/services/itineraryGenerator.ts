import { z } from "zod";
import { TripDay, tripDaySchema } from "@trip-master/shared";
import { getLLMProvider } from "../integrations/llm";

const generatedDaysSchema = z.array(tripDaySchema);

interface GenerateOptions {
  provider: string;
  model?: string;
  prompt: string;
  dayCount: number;
  startDate?: string;
  destination?: string;
  apiKey?: string;
}

export async function generateItineraryWithValidation(options: GenerateOptions, maxRetries = 2): Promise<TripDay[]> {
  const provider = getLLMProvider(options.provider);
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await provider.generateItinerary({
        prompt: options.prompt,
        model: options.model,
        dayCount: options.dayCount,
        startDate: options.startDate,
        destination: options.destination,
        apiKey: options.apiKey
      });
      const parsed = generatedDaysSchema.parse(raw);
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown generation error";
    }
  }

  throw new Error(lastError || "Failed to generate itinerary");
}
