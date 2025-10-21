// Blueprint: javascript_openai integration
import OpenAI from "openai";

// Note: the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TranslationContext {
  keyName: string;
  description?: string;
  sourceText: string;
  sourceLangName: string;
  targetLangName: string;
}

/**
 * Get AI-powered translation suggestion using OpenAI
 */
export async function getTranslationSuggestion(
  context: TranslationContext,
): Promise<string> {
  const { keyName, description, sourceText, sourceLangName, targetLangName } =
    context;

  // Build context for better translations
  const contextInfo = description
    ? `\nContext: ${description}\nTranslation key: ${keyName}`
    : `\nTranslation key: ${keyName}`;

  const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}.${contextInfo}

Text to translate: "${sourceText}"

Provide only the translation without any explanation or additional text.`;

  const response = await openai.chat.completions.create({
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
