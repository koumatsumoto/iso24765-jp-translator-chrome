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

        // Translate confer field if present
        if (word.confer && word.confer.length > 0) {
          translated.confer = word.confer;
          translated.confer_ja = [];
          for (const conferItem of word.confer) {
            translated.confer_ja.push(await translator.translate(conferItem));
          }
        }

        // Translate example field if present
        if (word.example) {
          translated.example = word.example;
          translated.example_ja = await translator.translate(word.example);
        }

        // Translate note field if present
        if (word.note) {
          translated.note = word.note;
          translated.note_ja = await translator.translate(word.note);
        }

        // Translate alias field if present
        if (word.alias && word.alias.length > 0) {
          translated.alias = word.alias;
          translated.alias_ja = [];
          for (const aliasItem of word.alias) {
            translated.alias_ja.push(await translator.translate(aliasItem));
          }
        }

        results.push(translated);

        // Progress logging every 10 items or on completion
        if ((i + 1) % 10 === 0 || i === wordsData.length - 1) {
          console.log(`Progress: ${i + 1}/${wordsData.length} (${Math.round(((i + 1) / wordsData.length) * 100)}%)`);
        }
      } catch (error) {
        console.error(`Failed: ${word.name}`, error);
        const failedTranslation: any = {
          number: word.number,
          name: word.name,
          name_ja: word.name,
          definitions: word.definitions.map((def: any) => ({
            text: def.text,
            text_ja: def.text,
            reference: def.reference,
          })),
        };

        // Copy untranslated fields
        if (word.confer) {
          failedTranslation.confer = word.confer;
          failedTranslation.confer_ja = word.confer;
        }
        if (word.example) {
          failedTranslation.example = word.example;
          failedTranslation.example_ja = word.example;
        }
        if (word.note) {
          failedTranslation.note = word.note;
          failedTranslation.note_ja = word.note;
        }
        if (word.alias) {
          failedTranslation.alias = word.alias;
          failedTranslation.alias_ja = word.alias;
        }

        results.push(failedTranslation);
      }
    }

    console.log(`Batch translation completed. Processed ${results.length} terms.`);
    return results;
  }, words);

  return result;
}
