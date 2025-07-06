import type { Page } from "playwright";
import type { Word, TranslatedWord } from "./types.ts";

export async function translateWordsBatch(page: Page, words: Word[]): Promise<TranslatedWord[]> {
  console.log(`Starting batch translation of ${words.length} terms...`);

  const results: TranslatedWord[] = [];

  await page.evaluate(async () => {
    (window as any).translator = await (window as any).Translator.create({
      sourceLanguage: "en",
      targetLanguage: "ja",
    });
  });

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    try {
      const translated = await page.evaluate(async (wordData) => {
        const translator = (window as any).translator;

        const result: any = {
          number: wordData.number,
          name: wordData.name,
          name_ja: await translator.translate(wordData.name),
          definitions: [],
        };

        for (const def of wordData.definitions) {
          result.definitions.push({
            text: def.text,
            text_ja: await translator.translate(def.text),
            reference: def.reference,
          });
        }

        return result;
      }, word);

      results.push(translated);

      // Progress logging every 10 items or on completion
      if ((i + 1) % 10 === 0 || i === words.length - 1) {
        console.log(`Progress: ${i + 1}/${words.length} (${Math.round(((i + 1) / words.length) * 100)}%)`);
      }
    } catch (error) {
      console.error(`Failed: ${word.name}`, error);
      results.push({
        number: word.number,
        name: word.name,
        name_ja: word.name,
        definitions: word.definitions.map((def) => ({
          text: def.text,
          text_ja: def.text,
          reference: def.reference,
        })),
      });
    }
  }

  console.log(`Batch translation completed. Processed ${results.length} terms.`);
  return results;
}
