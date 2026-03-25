import type {
  TranslationProvider,
  TranslationContext,
  TranslationProviderType,
} from "./types";
import { OpenAIProvider } from "./openai";
import { MicrosoftProvider } from "./microsoft";
import { GoogleProvider } from "./google";

class TranslationServiceManager {
  private providers: Map<TranslationProviderType, TranslationProvider> =
    new Map();
  private defaultProvider: TranslationProviderType = "microsoft";

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize OpenAI provider
    try {
      if (process.env.OPENAI_API_KEY) {
        this.providers.set("openai", new OpenAIProvider());
      }
    } catch (error) {
      console.warn("OpenAI provider not available:", error);
    }

    // Initialize Microsoft provider
    try {
      if (process.env.MICROSOFT_TRANSLATOR_API_KEY) {
        this.providers.set("microsoft", new MicrosoftProvider());
      }
    } catch (error) {
      console.warn("Microsoft Translator provider not available:", error);
    }

    // Initialize Google provider
    try {
      if (process.env.GOOGLE_TRANSLATE_API_KEY) {
        this.providers.set("google", new GoogleProvider());
      }
    } catch (error) {
      console.warn("Google Translate provider not available:", error);
    }

    // Set default provider: prefer Microsoft, otherwise use first available
    if (this.providers.has("microsoft")) {
      this.defaultProvider = "microsoft";
    } else if (this.providers.size > 0) {
      this.defaultProvider = Array.from(this.providers.keys())[0];
    }
  }

  getProvider(type?: TranslationProviderType): TranslationProvider {
    const providerType = type || this.defaultProvider;
    const provider = this.providers.get(providerType);

    if (!provider) {
      throw new Error(
        `Translation provider '${providerType}' is not available. Available providers: ${Array.from(
          this.providers.keys()
        ).join(", ")}`
      );
    }

    return provider;
  }

  getAvailableProviders(): TranslationProviderType[] {
    return Array.from(this.providers.keys());
  }

  async translate(
    context: TranslationContext,
    providerType?: TranslationProviderType
  ): Promise<string> {
    const provider = this.getProvider(providerType);
    return provider.translate(context);
  }

  setDefaultProvider(type: TranslationProviderType) {
    if (!this.providers.has(type)) {
      throw new Error(`Provider '${type}' is not available`);
    }
    this.defaultProvider = type;
  }
}

// Export singleton instance
export const translationService = new TranslationServiceManager();

// Export convenience function for backward compatibility
export async function getTranslationSuggestion(
  context: TranslationContext,
  providerType?: TranslationProviderType
): Promise<string> {
  return translationService.translate(context, providerType);
}
