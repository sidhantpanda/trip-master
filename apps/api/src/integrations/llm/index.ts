import { LLMProviderAdapter } from "./types";
import { MockLLMProvider } from "./mockProvider";
import { OpenAIProvider } from "./openaiProvider";

export function getLLMProvider(provider: string, apiKey?: string): LLMProviderAdapter {
  switch (provider) {
    case "mock":
      return new MockLLMProvider();
    case "openai":
      return new OpenAIProvider(apiKey || "");
    case "anthropic":
    case "gemini":
      throw new Error(`LLM provider "${provider}" is not implemented yet`);
    default:
      throw new Error(`Unknown LLM provider "${provider}"`);
  }
}
