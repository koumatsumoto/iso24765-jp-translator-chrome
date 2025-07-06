import type { Page } from "playwright";

/**
 * Translate text using Chrome Translator API
 */
export async function translateText(page: Page, text: string): Promise<string> {
  if (!text?.trim()) {
    return "";
  }

  if (text.length > 5000) {
    throw new Error("Text too long");
  }

  const result = await Promise.race([
    page.evaluate(async (inputText) => {
      const translator = await (window as any).Translator.create({
        sourceLanguage: "en",
        targetLanguage: "ja",
      });
      return await translator.translate(inputText);
    }, text),

    new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Translation timeout")), 10000)),
  ]);

  if (!result || typeof result !== "string") {
    throw new Error("Invalid translation result");
  }

  return result;
}
