import { LLMProviderAdapter, MockLLMProvider } from "./mockProvider";

export function getLLMProvider(provider: string): LLMProviderAdapter {
  switch (provider) {
    case "openai":
    case "anthropic":
    case "gemini":
    case "mock":
    default:
      if (provider !== "mock") {
        console.warn(`Provider "${provider}" not implemented, falling back to mock generator.`);
      }
      return new MockLLMProvider();
  }
}
