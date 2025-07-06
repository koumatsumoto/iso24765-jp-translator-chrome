import type { Page } from "playwright";
import type { Word, TranslatedWord } from "./types.ts";

export async function translateWordsBatch(page: Page, words: Word[]): Promise<TranslatedWord[]> {
  console.log(`Starting batch translation of ${words.length} terms...`);

  // Connect browser console logs to Node.js terminal
  page.on("console", (msg) => {
    console.log(`Browser: ${msg.text()}`);
  });

  const result = await page.evaluate(async (wordsData) => {
    const translator = await (window as any).Translator.create({
      sourceLanguage: "en",
      targetLanguage: "ja",
    });

    const results: any[] = [];

    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      if (!word) continue;

      try {
        const translated: any = {
          number: word.number,
          name: word.name,
          name_ja: await translator.translate(word.name),
          definitions: [],
        };

        for (const def of word.definitions) {
          translated.definitions.push({
            text: def.text,
            text_ja: await translator.translate(def.text),
            reference: def.reference,
          });
        }

        results.push(translated);

        // Progress logging every 10 items or on completion
        if ((i + 1) % 10 === 0 || i === wordsData.length - 1) {
          console.log(`Progress: ${i + 1}/${wordsData.length} (${Math.round(((i + 1) / wordsData.length) * 100)}%)`);
        }
      } catch (error) {
        console.error(`Failed: ${word.name}`, error);
        results.push({
          number: word.number,
          name: word.name,
          name_ja: word.name,
          definitions: word.definitions.map((def: any) => ({
            text: def.text,
            text_ja: def.text,
            reference: def.reference,
          })),
        });
      }
    }

    console.log(`Batch translation completed. Processed ${results.length} terms.`);
    return results;
  }, words);

  return result;
}
