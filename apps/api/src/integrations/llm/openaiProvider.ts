import OpenAI from "openai";
import { TripDay } from "@trip-master/shared";

import { GenerateOptions, LLMProviderAdapter } from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";

function buildSystemPrompt() {
  return [
    "You are an expert travel planner.",
    "Return ONLY JSON in the shape: { \"days\": [ { \"dayIndex\": number, \"date\": ISO8601 string, \"items\": [ { \"title\": string, \"description\"?: string, \"category\"?: string, \"startTime\"?: string, \"endTime\"?: string, \"location\"?: { \"name\"?: string, \"address\"?: string, \"placeId\"?: string, \"lat\"?: number, \"lng\"?: number }, \"links\"?: [ { \"label\": string, \"url\": string } ], \"notes\"?: string } ], \"routes\"?: { \"mode\"?: \"driving\" | \"transit\" | \"walking\", \"polyline\"?: string, \"distanceMeters\"?: number, \"durationSeconds\"?: number } } ] }.",
    "Dates must be ISO 8601.",
    "If a field is unknown, omit it.",
    "Do not include any extra keys or text outside the JSON."
  ].join(" ");
}

function buildUserPrompt(options: GenerateOptions) {
  const parts = [
    `Destination: ${options.destination ?? "Unknown"}.`,
    `Day count: ${options.dayCount}.`,
    options.startDate ? `Start date: ${options.startDate}.` : "",
    options.prompt ? `User prompt: ${options.prompt}` : ""
  ];
  return parts.filter(Boolean).join(" ");
}

export class OpenAIProvider implements LLMProviderAdapter {
  private client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.client = new OpenAI({ apiKey });
  }

  async generateItinerary(options: GenerateOptions): Promise<TripDay[]> {
    const model = options.model || DEFAULT_MODEL;
    const completion = await this.client.chat.completions.create({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(options) }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty content");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error(`Failed to parse OpenAI response: ${(err as Error).message}`);
    }

    const days: TripDay[] | undefined = parsed?.days;
    if (!Array.isArray(days)) {
      throw new Error("OpenAI response missing days array");
    }

    return days;
  }
}
