import OpenAI from "openai";
import type { TranslationProvider, TranslationContext } from "./types";

export class OpenAIProvider implements TranslationProvider {
  name = "openai";
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.client = new OpenAI({ apiKey });
  }

  async translate(context: TranslationContext): Promise<string> {
    const { keyName, description, sourceText, sourceLangName, targetLangName } =
      context;

    // Build context for better translations
    const contextInfo = description
      ? `\nContext: ${description}\nTranslation key: ${keyName}`
      : `\nTranslation key: ${keyName}`;

    const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}.${contextInfo}

Text to translate: "${sourceText}"

Provide only the translation without any explanation or additional text.`;

    const response = await this.client.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Provide accurate, natural-sounding translations that preserve the tone and context of the original text. Keep placeholders (e.g., {name}, {count}) unchanged. Return only the translated text without explanations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 1000,
    });

    const suggestion = response.choices[0].message.content?.trim() || "";
    return suggestion;
  }

  async generateDescription(
    keyName: string,
    exampleTranslations?: string
  ): Promise<string> {
    const prompt = `Generate a brief, helpful description for a translation key in a localization system.

Translation key: "${keyName}"
${exampleTranslations ? `Example translations: ${exampleTranslations}` : ""}

Provide a concise description (1-2 sentences) that explains the context and usage of this translation key. The description should help translators understand when and where this text appears in the application. Return only the description text without any explanations or labels.`;

    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates clear, concise descriptions for translation keys in software localization systems.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const suggestion = response.choices[0]?.message?.content?.trim() || "";
    return suggestion;
  }
}

