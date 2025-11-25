export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Claude 3.5 Haiku",
    description: "Fast multimodal model with vision and text capabilities",
  },
  {
    id: "chat-model-reasoning",
    name: "Claude 3.5 Haiku (Reasoning)",
    description: "Optimized for complex problems requiring careful analysis",
  },
];
