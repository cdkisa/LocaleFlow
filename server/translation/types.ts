export interface TranslationContext {
  keyName: string;
  description?: string;
  sourceText: string;
  sourceLangName: string;
  targetLangName: string;
  sourceLanguageCode?: string;
  targetLanguageCode?: string;
}

export interface TranslationProvider {
  name: string;
  translate(context: TranslationContext): Promise<string>;
}

export type TranslationProviderType = "openai" | "microsoft" | "google";

