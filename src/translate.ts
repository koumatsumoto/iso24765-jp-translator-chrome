import type { Page } from "playwright";
import type { Word, TranslatedWord } from "./types.ts";

export async function translateWordsBatch(page: Page, words: Word[], concurrency: number = 10): Promise<TranslatedWord[]> {
  console.log(`Starting batch translation of ${words.length} terms with concurrency: ${concurrency}...`);

  // Connect browser console logs to Node.js terminal
  page.on("console", (msg) => {
    console.log(`Browser: ${msg.text()}`);
  });

  const result = await page.evaluate(
    async ({ wordsData, maxConcurrency }: { wordsData: Word[]; maxConcurrency: number }) => {
      interface BrowserTranslator {
        translate(text: string): Promise<string>;
      }

      const translator = await (
        window as unknown as { Translator: { create(config: { sourceLanguage: string; targetLanguage: string }): Promise<BrowserTranslator> } }
      ).Translator.create({
        sourceLanguage: "en",
        targetLanguage: "ja",
      });

      // Helper function to translate a single word with parallel sub-operations
      async function translateWord(word: Word): Promise<TranslatedWord> {
        try {
          const translationTasks: Promise<string>[] = [];

          // Collect all translation tasks for this word
          translationTasks.push(translator.translate(word.name));

          // Collect definition translations
          const definitionTasks = word.definitions.map((def) => translator.translate(def.text));
          translationTasks.push(...definitionTasks);

          // Collect optional field translations
          const optionalTasks: Promise<string>[] = [];
          if (word.confer && word.confer.length > 0) {
            optionalTasks.push(...word.confer.map((item) => translator.translate(item)));
          }
          if (word.example) {
            optionalTasks.push(translator.translate(word.example));
          }
          if (word.note) {
            optionalTasks.push(translator.translate(word.note));
          }
          if (word.alias && word.alias.length > 0) {
            optionalTasks.push(...word.alias.map((item) => translator.translate(item)));
          }

          // Execute all translations in parallel
          const [nameTranslation, ...definitionTranslations] = await Promise.all(translationTasks);
          const optionalTranslations = optionalTasks.length > 0 ? await Promise.all(optionalTasks) : [];

          // Build result object
          const translated: TranslatedWord = {
            number: word.number,
            name: word.name,
            name_ja: nameTranslation || word.name,
            definitions: word.definitions.map((def, index) => ({
              text: def.text,
              text_ja: definitionTranslations[index] || def.text,
              reference: def.reference,
            })),
          };

          // Map optional translations back to their fields
          let optionalIndex = 0;
          if (word.confer && word.confer.length > 0) {
            translated.confer = word.confer;
            translated.confer_ja = word.confer.map(() => optionalTranslations[optionalIndex++]) as [string, ...string[]];
          }
          if (word.example) {
            translated.example = word.example;
            translated.example_ja = optionalTranslations[optionalIndex++];
          }
          if (word.note) {
            translated.note = word.note;
            translated.note_ja = optionalTranslations[optionalIndex++];
          }
          if (word.alias && word.alias.length > 0) {
            translated.alias = word.alias;
            translated.alias_ja = word.alias.map(() => optionalTranslations[optionalIndex++]) as [string, ...string[]];
          }

          return translated;
        } catch (error) {
          console.error(`Failed: ${word.name}`, error);
          return {
            number: word.number,
            name: word.name,
            name_ja: word.name,
            definitions: word.definitions.map((def) => ({
              text: def.text,
              text_ja: def.text,
              reference: def.reference,
            })),
            ...(word.confer && { confer: word.confer, confer_ja: word.confer }),
            ...(word.example && { example: word.example, example_ja: word.example }),
            ...(word.note && { note: word.note, note_ja: word.note }),
            ...(word.alias && { alias: word.alias, alias_ja: word.alias }),
          };
        }
      }

      // Process words in batches with controlled concurrency
      const results: TranslatedWord[] = [];
      const totalWords = wordsData.length;

      for (let i = 0; i < totalWords; i += maxConcurrency) {
        const batch = wordsData.slice(i, i + maxConcurrency);
        const batchResults = await Promise.all(batch.map(translateWord));
        results.push(...batchResults);

        // Progress logging
        const completed = Math.min(i + maxConcurrency, totalWords);
        console.log(`Progress: ${completed}/${totalWords} (${Math.round((completed / totalWords) * 100)}%)`);
      }

      console.log(`Batch translation completed. Processed ${results.length} terms.`);
      return results;
    },
    { wordsData: words, maxConcurrency: concurrency },
  );

  return result;
}
