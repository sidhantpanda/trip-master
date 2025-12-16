import { TripDay } from "@trip-master/shared";

export interface GenerateOptions {
  prompt: string;
  model?: string;
  dayCount: number;
  startDate?: string;
  destination?: string;
  apiKey?: string;
}

export interface LLMProviderAdapter {
  generateItinerary(options: GenerateOptions): Promise<TripDay[]>;
}
