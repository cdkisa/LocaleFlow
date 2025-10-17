import mammoth from "mammoth";

export interface ParsedDocument {
  text: string;
  error?: string;
}

export async function parseWordDocument(
  buffer: Buffer
): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value.trim(),
      error: result.messages.length > 0 
        ? result.messages.map(m => m.message).join("; ") 
        : undefined
    };
  } catch (error) {
    console.error("Error parsing Word document:", error);
    return {
      text: "",
      error: error instanceof Error ? error.message : "Unknown error parsing Word document"
    };
  }
}

export async function parsePdfDocument(
  buffer: Buffer
): Promise<ParsedDocument> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return {
      text: data.text.trim(),
    };
  } catch (error) {
    console.error("Error parsing PDF document:", error);
    return {
      text: "",
      error: error instanceof Error ? error.message : "Unknown error parsing PDF document"
    };
  }
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string
): Promise<ParsedDocument> {
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return parseWordDocument(buffer);
  } else if (mimeType === "application/pdf") {
    return parsePdfDocument(buffer);
  } else {
    return {
      text: "",
      error: `Unsupported file type: ${mimeType}`
    };
  }
}
