import type { TranslationProvider, TranslationContext } from "./types";

// Language code mapping for Microsoft Translator
const LANGUAGE_CODE_MAP: Record<string, string> = {
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  chinese: "zh",
  japanese: "ja",
  korean: "ko",
  russian: "ru",
  arabic: "ar",
  hindi: "hi",
  dutch: "nl",
  polish: "pl",
  turkish: "tr",
  swedish: "sv",
  danish: "da",
  norwegian: "no",
  finnish: "fi",
  greek: "el",
  czech: "cs",
  hungarian: "hu",
  romanian: "ro",
  thai: "th",
  vietnamese: "vi",
  indonesian: "id",
  malay: "ms",
};

function getLanguageCode(langName: string, providedCode?: string): string {
  if (providedCode) return providedCode;
  
  const normalized = langName.toLowerCase().trim();
  return LANGUAGE_CODE_MAP[normalized] || normalized.split(" ")[0].toLowerCase();
}

export class MicrosoftProvider implements TranslationProvider {
  name = "microsoft";
  private apiKey: string;
  private region: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.MICROSOFT_TRANSLATOR_API_KEY || "";
    this.region = process.env.MICROSOFT_TRANSLATOR_REGION || "global";
    this.endpoint = `https://api.cognitive.microsofttranslator.com`;

    if (!this.apiKey) {
      throw new Error(
        "MICROSOFT_TRANSLATOR_API_KEY environment variable is required"
      );
    }
  }

  async translate(context: TranslationContext): Promise<string> {
    const { sourceText, sourceLangName, targetLangName, sourceLanguageCode, targetLanguageCode } = context;

    const from = getLanguageCode(sourceLangName, sourceLanguageCode);
    const to = getLanguageCode(targetLangName, targetLanguageCode);

    const url = `${this.endpoint}/translate?api-version=3.0&from=${from}&to=${to}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": this.apiKey,
        "Ocp-Apim-Subscription-Region": this.region,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ Text: sourceText }]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Microsoft Translator API error: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    return data[0]?.translations?.[0]?.text || sourceText;
  }
}

