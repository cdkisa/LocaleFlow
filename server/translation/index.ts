// Translation service module
// Provides support for multiple AI translation providers:
// - OpenAI (GPT-5)
// - Microsoft Translator
// - Google Translate

export { translationService, getTranslationSuggestion } from "./manager";
export type { TranslationProvider, TranslationContext, TranslationProviderType } from "./types";
export { OpenAIProvider } from "./openai";
export { MicrosoftProvider } from "./microsoft";
export { GoogleProvider } from "./google";

