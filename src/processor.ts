import { promises as fs } from "fs";
import { BrowserManager } from "./browser.ts";
import { ChromeTranslator } from "./translator.ts";
import type { Word, TranslatedWord, TranslationStatus, TranslationConfig } from "./types.ts";

/**
 * Translation processor for ISO 24765 terminology
 */
export class TranslationProcessor {
  private browserManager: BrowserManager;
  private translator: ChromeTranslator | null = null;
  private config: TranslationConfig;
  private status: TranslationStatus;

  constructor(config: Partial<TranslationConfig> = {}) {
    this.browserManager = new BrowserManager();
    this.config = {
      batchSize: 10,
      retryCount: 3,
      retryDelay: 1000,
      contextTemplate: "システム・ソフトウェア開発の専門用語としての文脈における用語の説明：{text}",
      sourceLanguage: "en",
      targetLanguage: "ja",
      ...config,
    };
    this.status = {
      total: 0,
      completed: 0,
      failed: 0,
      progress: 0,
      errors: [],
    };
  }

  /**
   * Initialize the translation processor
   */
  async initialize(): Promise<void> {
    try {
      console.log("Initializing translation processor...");

      // Initialize browser
      await this.browserManager.initialize();

      // Check Chrome version
      const chromeVersion = await this.browserManager.getChromeVersion();
      console.log(`Chrome version: ${chromeVersion}`);

      // Check if Translator API is available
      const isAPIAvailable = await this.browserManager.isTranslatorAPIAvailable();
      if (!isAPIAvailable) {
        throw new Error("Chrome Translator API is not available. Please ensure you are using Chrome 138 or later.");
      }

      // Initialize translator
      this.translator = new ChromeTranslator(this.browserManager.getPage(), this.config);
      await this.translator.initialize();

      console.log("Translation processor initialized successfully");
    } catch (error) {
      console.error("Failed to initialize translation processor:", error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Load terminology data from JSON file
   */
  async loadTerminologyData(filePath: string): Promise<Word[]> {
    try {
      console.log(`Loading terminology data from: ${filePath}`);
      const data = await fs.readFile(filePath, "utf-8");
      const words: Word[] = JSON.parse(data);

      if (!Array.isArray(words)) {
        throw new Error("Invalid terminology data format: expected array of words");
      }

      console.log(`Loaded ${words.length} terms`);
      return words;
    } catch (error) {
      console.error("Failed to load terminology data:", error);
      throw error;
    }
  }

  /**
   * Process translation for all terms
   */
  async processTranslation(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Load terminology data
      const words = await this.loadTerminologyData(inputPath);

      // Initialize status
      this.status.total = words.length;
      this.status.completed = 0;
      this.status.failed = 0;
      this.status.progress = 0;
      this.status.errors = [];

      console.log(`Starting translation of ${words.length} terms...`);

      // Process in batches with optimized memory management
      const translatedWords: TranslatedWord[] = [];
      const batchSize = this.config.batchSize;
      const totalBatches = Math.ceil(words.length / batchSize);

      // Create backup saves every 100 words
      const backupInterval = 100;

      for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} terms)`);

        // Display progress bar
        const progressBar = this.createProgressBar(this.status.progress, 50);
        process.stdout.write(`\r${progressBar} ${this.status.progress.toFixed(1)}%`);

        const batchResults = await this.processBatch(batch);
        translatedWords.push(...batchResults);

        // Update progress
        this.status.completed = translatedWords.length;
        this.status.progress = (this.status.completed / this.status.total) * 100;

        // Create backup save periodically
        if (this.status.completed % backupInterval === 0) {
          const backupPath = outputPath.replace(".json", `.backup-${this.status.completed}.json`);
          await this.saveTranslatedTerminology(translatedWords, backupPath);
          console.log(`\nBackup saved: ${backupPath}`);
        }

        // Adaptive delay based on batch size and system performance
        if (i + batchSize < words.length) {
          const adaptiveDelay = this.calculateAdaptiveDelay(batchSize, batchResults.length);
          await this.delay(adaptiveDelay);
        }

        // Memory cleanup hint
        if (global.gc && batchNumber % 10 === 0) {
          global.gc();
        }
      }

      // Clear progress bar
      process.stdout.write("\n");

      // Save final results
      await this.saveTranslatedTerminology(translatedWords, outputPath);

      console.log(`Translation completed successfully. Results saved to: ${outputPath}`);
      console.log(`Total: ${this.status.total}, Completed: ${this.status.completed}, Failed: ${this.status.failed}`);

      // Show detailed statistics
      this.printStatistics();
    } catch (error) {
      console.error("Translation processing failed:", error);
      throw error;
    }
  }

  /**
   * Process a batch of terms
   */
  private async processBatch(batch: Word[]): Promise<TranslatedWord[]> {
    const results: TranslatedWord[] = [];

    for (const word of batch) {
      try {
        this.status.currentWord = word.name;
        const translatedWord = await this.translateWord(word);
        results.push(translatedWord);
      } catch (error) {
        console.error(`Failed to translate word "${word.name}":`, error);
        this.status.failed++;
        this.status.errors.push(`${word.name}: ${error instanceof Error ? error.message : "Unknown error"}`);

        // Add partial result with original text
        results.push(this.createPartialTranslation(word));
      }
    }

    return results;
  }

  /**
   * Translate a single word with all its fields
   */
  private async translateWord(word: Word): Promise<TranslatedWord> {
    if (!this.translator) {
      throw new Error("Translator not initialized");
    }

    const translatedWord: TranslatedWord = {
      number: word.number,
      name: word.name,
      name_ja: "",
      definitions: word.definitions.map((def) => ({
        text: def.text,
        text_ja: "",
        reference: def.reference,
      })),
    };

    // Translate name
    const nameRequest = this.translator.createContextRequest(word.name);
    const nameResult = await this.translator.translate(nameRequest);
    translatedWord.name_ja = nameResult.success ? nameResult.translatedText : word.name;

    // Translate alias if exists
    if (word.alias && this.translator) {
      const aliasTranslations = await this.translator.translateBatch(word.alias.map((alias) => this.translator!.createContextRequest(alias)));
      if (aliasTranslations.length > 0) {
        translatedWord.alias = word.alias;
        translatedWord.alias_ja = aliasTranslations.filter((result) => result.success).map((result) => result.translatedText) as [
          string,
          ...string[],
        ];
      }
    }

    // Translate definitions
    if (this.translator) {
      const translator = this.translator; // Capture reference
      for (let i = 0; i < word.definitions.length; i++) {
        const originalDef = word.definitions[i];
        const translatedDef = translatedWord.definitions[i];
        if (originalDef && translatedDef) {
          const defRequest = translator.createContextRequest(originalDef.text);
          const defResult = await translator.translate(defRequest);
          translatedDef.text_ja = defResult.success ? defResult.translatedText : originalDef.text;
        }
      }
    }

    // Translate confer if exists
    if (word.confer && this.translator) {
      const conferTranslations = await this.translator.translateBatch(word.confer.map((confer) => this.translator!.createContextRequest(confer)));
      if (conferTranslations.length > 0) {
        translatedWord.confer = word.confer;
        translatedWord.confer_ja = conferTranslations.filter((result) => result.success).map((result) => result.translatedText) as [
          string,
          ...string[],
        ];
      }
    }

    // Translate example if exists
    if (word.example && this.translator) {
      const exampleRequest = this.translator.createContextRequest(word.example);
      const exampleResult = await this.translator.translate(exampleRequest);
      translatedWord.example = word.example;
      translatedWord.example_ja = exampleResult.success ? exampleResult.translatedText : word.example;
    }

    // Translate note if exists
    if (word.note && this.translator) {
      const noteRequest = this.translator.createContextRequest(word.note);
      const noteResult = await this.translator.translate(noteRequest);
      translatedWord.note = word.note;
      translatedWord.note_ja = noteResult.success ? noteResult.translatedText : word.note;
    }

    return translatedWord;
  }

  /**
   * Create partial translation for failed cases
   */
  private createPartialTranslation(word: Word): TranslatedWord {
    const result: TranslatedWord = {
      number: word.number,
      name: word.name,
      name_ja: word.name, // Use original as fallback
      definitions: word.definitions.map((def) => ({
        text: def.text,
        text_ja: def.text, // Use original as fallback
        reference: def.reference,
      })),
    };

    // Add optional fields only if they exist
    if (word.alias) {
      result.alias = word.alias;
      result.alias_ja = word.alias;
    }
    if (word.confer) {
      result.confer = word.confer;
      result.confer_ja = word.confer;
    }
    if (word.example) {
      result.example = word.example;
      result.example_ja = word.example;
    }
    if (word.note) {
      result.note = word.note;
      result.note_ja = word.note;
    }

    return result;
  }

  /**
   * Save translated terminology to JSON file
   */
  async saveTranslatedTerminology(words: TranslatedWord[], filePath: string): Promise<void> {
    try {
      const data = JSON.stringify(words, null, 2);
      await fs.writeFile(filePath, data, "utf-8");
      console.log(`Translated terminology saved to: ${filePath}`);
    } catch (error) {
      console.error("Failed to save translated terminology:", error);
      throw error;
    }
  }

  /**
   * Get current translation status
   */
  getStatus(): TranslationStatus {
    return { ...this.status };
  }

  /**
   * Get configuration
   */
  getConfig(): TranslationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TranslationConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.translator) {
      this.translator.updateConfig(config);
    }
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if processor is initialized
   */
  isInitialized(): boolean {
    return this.browserManager.isInitialized() && this.translator !== null && this.translator.isInitialized();
  }

  /**
   * Create progress bar visualization
   */
  private createProgressBar(progress: number, width: number): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    return `[${"█".repeat(filled)}${" ".repeat(empty)}]`;
  }

  /**
   * Calculate adaptive delay based on performance metrics
   */
  private calculateAdaptiveDelay(batchSize: number, successCount: number): number {
    const baseDelay = 1000; // 1 second base
    const failureRate = (batchSize - successCount) / batchSize;

    // Increase delay if there are failures
    if (failureRate > 0.2) {
      return baseDelay * 3; // 3 seconds if high failure rate
    } else if (failureRate > 0.1) {
      return baseDelay * 2; // 2 seconds if moderate failure rate
    } else {
      return baseDelay; // Normal delay
    }
  }

  /**
   * Print detailed statistics
   */
  private printStatistics(): void {
    console.log("\n=== Translation Statistics ===");
    console.log(`Total terms: ${this.status.total}`);
    console.log(`Successfully translated: ${this.status.completed}`);
    console.log(`Failed translations: ${this.status.failed}`);
    console.log(`Success rate: ${((this.status.completed / this.status.total) * 100).toFixed(1)}%`);

    if (this.status.errors.length > 0) {
      console.log("\n=== Error Summary ===");
      this.status.errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });

      if (this.status.errors.length > 10) {
        console.log(`... and ${this.status.errors.length - 10} more errors`);
      }
    }
  }

  /**
   * Resume translation from a backup file
   */
  async resumeTranslation(backupPath: string, inputPath: string, outputPath: string): Promise<void> {
    try {
      console.log(`Resuming translation from backup: ${backupPath}`);

      // Load backup data
      const backupData = await fs.readFile(backupPath, "utf-8");
      const completedWords: TranslatedWord[] = JSON.parse(backupData);

      // Load original data
      const allWords = await this.loadTerminologyData(inputPath);

      // Find remaining words
      const completedNumbers = new Set(completedWords.map((w) => w.number));
      const remainingWords = allWords.filter((w) => !completedNumbers.has(w.number));

      console.log(`Resuming from ${completedWords.length} completed terms`);
      console.log(`${remainingWords.length} terms remaining`);

      if (remainingWords.length === 0) {
        console.log("All terms already translated");
        return;
      }

      // Update status
      this.status.total = allWords.length;
      this.status.completed = completedWords.length;
      this.status.failed = 0;
      this.status.progress = (this.status.completed / this.status.total) * 100;
      this.status.errors = [];

      // Process remaining terms
      const batchSize = this.config.batchSize;
      const translatedWords = [...completedWords];

      for (let i = 0; i < remainingWords.length; i += batchSize) {
        const batch = remainingWords.slice(i, i + batchSize);
        const batchResults = await this.processBatch(batch);
        translatedWords.push(...batchResults);

        // Update progress
        this.status.completed = translatedWords.length;
        this.status.progress = (this.status.completed / this.status.total) * 100;

        console.log(`Progress: ${this.status.completed}/${this.status.total} (${this.status.progress.toFixed(1)}%)`);

        // Save intermediate results
        if (this.status.completed % 100 === 0) {
          await this.saveTranslatedTerminology(translatedWords, outputPath);
        }
      }

      // Save final results
      await this.saveTranslatedTerminology(translatedWords, outputPath);

      console.log(`Resume translation completed successfully. Results saved to: ${outputPath}`);
      this.printStatistics();
    } catch (error) {
      console.error("Resume translation failed:", error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.translator) {
        await this.translator.cleanup();
      }
      await this.browserManager.cleanup();
      console.log("Translation processor cleaned up successfully");
    } catch (error) {
      console.error("Error during processor cleanup:", error);
    }
  }
}
