import type { Page } from "playwright";
import type { Word, TranslatedWord } from "./types.ts";

export async function translateWordsBatch(page: Page, words: Word[]): Promise<TranslatedWord[]> {
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
        console.log(`${i + 1}/${wordsData.length}: ${word.name}`);
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

    return results;
  }, words);

  return result;
}
