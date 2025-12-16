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

export class MockLLMProvider implements LLMProviderAdapter {
  async generateItinerary(options: GenerateOptions): Promise<TripDay[]> {
    const { dayCount, startDate, destination } = options;
    const baseDate = startDate ? new Date(startDate) : new Date();

    const days: TripDay[] = [];
    for (let i = 0; i < Math.max(1, dayCount); i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      days.push({
        dayIndex: i,
        date: date.toISOString(),
        items: [
          {
            title: `Morning explore ${destination ?? "the city"}`,
            notes: "Coffee and a short walk to get familiar with the area."
          },
          {
            title: "Midday highlight",
            notes: "Visit a landmark and grab lunch nearby."
          },
          {
            title: "Evening unwind",
            notes: "Dinner at a local spot and a relaxing stroll."
          }
        ]
      });
    }

    return days;
  }
}
