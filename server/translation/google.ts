import type { TranslationProvider, TranslationContext } from "./types";

// Language code mapping for Google Translate
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

export class GoogleProvider implements TranslationProvider {
  name = "google";
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || "";
    this.endpoint = "https://translation.googleapis.com/language/translate/v2";

    if (!this.apiKey) {
      throw new Error(
        "GOOGLE_TRANSLATE_API_KEY environment variable is required"
      );
    }
  }

  async translate(context: TranslationContext): Promise<string> {
    const { sourceText, sourceLangName, targetLangName, sourceLanguageCode, targetLanguageCode } = context;

    const source = getLanguageCode(sourceLangName, sourceLanguageCode);
    const target = getLanguageCode(targetLangName, targetLanguageCode);

    const url = `${this.endpoint}?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: sourceText,
        source,
        target,
        format: "text",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Translate API error: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    return data.data?.translations?.[0]?.translatedText || sourceText;
  }
}

