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
export async function getTranslationSuggestion(context: TranslationContext): Promise<string> {
  const { keyName, description, sourceText, sourceLangName, targetLangName } = context;

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
        content: "You are a professional translator. Provide accurate, natural-sounding translations that preserve the tone and context of the original text. Return only the translated text without explanations.",
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

export async function translateWithAssistant({
  assistantId,
  sourceText,
  targetLang,
  context,
}: TranslateArgs): Promise<string> {
  // 1) Create a thread (one per job or per batch/session—your choice)
  const thread = await openai.beta.threads.create();

  // 2) Add the user message with strict placeholder guidance for ICU/tokens
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: [
      {
        type: "text",
        text:
          `Translate into ${targetLang}. Keep placeholders intact (e.g., {name}, {count}). ` +
          `Return only the translation.\n` +
          (context ? `Context: ${context}\n` : "") +
          `Text: """${sourceText}"""`,
      },
    ],
  });

  // 3) Run the assistant on that thread
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId,
  });

  // 4) Poll until complete (simple polling; you can also stream)
  let runStatus = run;
  while (runStatus.status === "queued" || runStatus.status === "in_progress") {
    await new Promise(r => setTimeout(r, 400));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, runStatus.id);
  }

  if (runStatus.status !== "completed") {
    throw new Error(`Assistant run failed: ${runStatus.status}`);
  }

  // 5) Read the latest assistant message
  const list = await openai.beta.threads.messages.list(thread.id, { order: "desc", limit: 1 });
  const msg = list.data.find(m => m.role === "assistant");
  const textPart = msg?.content.find(c => c.type === "text");
  const translation = textPart && "text" in textPart ? textPart.text.value : "";

  if (!translation) throw new Error("No translation text returned.");
  return translation.trim();
}