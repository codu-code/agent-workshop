import { gateway } from "@ai-sdk/gateway";
import { customProvider } from "ai";

export const myProvider = customProvider({
  languageModels: {
    // Multimodal model - supports images, cheap and fast
    "chat-model": gateway.languageModel("anthropic/claude-3-5-haiku-latest"),
    // Reasoning model - using Haiku (no special reasoning tags needed)
    "chat-model-reasoning": gateway.languageModel(
      "anthropic/claude-3-5-haiku-latest"
    ),
    // Simple/cheap model for titles - using Haiku for consistency
    "title-model": gateway.languageModel("anthropic/claude-3-5-haiku-latest"),
    // Simple/cheap model for artifacts - using Haiku for consistency
    "artifact-model": gateway.languageModel(
      "anthropic/claude-3-5-haiku-latest"
    ),
  },
});
