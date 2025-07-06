import type { Page } from "playwright";
import type { TranslationRequest, TranslationResponse, TranslationConfig } from "./types.ts";

/**
 * Chrome Translator API wrapper
 */
export class ChromeTranslator {
  private page: Page;
  private config: TranslationConfig;
  private translatorInstance: any = null;

  constructor(page: Page, config: Partial<TranslationConfig> = {}) {
    this.page = page;
    this.config = {
      batchSize: 10,
      retryCount: 3,
      retryDelay: 1000,
      contextTemplate: "システム・ソフトウェア開発の専門用語としての文脈における用語の説明：{text}",
      sourceLanguage: "en",
      targetLanguage: "ja",
      ...config,
    };
  }

  /**
   * Initialize the translator
   */
  async initialize(): Promise<void> {
    try {
      // Check if Translator API is available
      const isAvailable = await this.page.evaluate(() => {
        return "Translator" in window && typeof (window as any).Translator?.create === "function";
      });

      if (!isAvailable) {
        throw new Error("Translator API is not available in this Chrome version");
      }

      // Create translator instance
      this.translatorInstance = await this.page.evaluate(
        async ({ sourceLanguage, targetLanguage }) => {
          const translator = await (window as any).Translator.create({
            sourceLanguage,
            targetLanguage,
          });
          return translator;
        },
        {
          sourceLanguage: this.config.sourceLanguage,
          targetLanguage: this.config.targetLanguage,
        },
      );

      console.log("Chrome Translator initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Chrome Translator:", error);
      throw error;
    }
  }

  /**
   * Check if translator is available and ready
   */
  async isReady(): Promise<boolean> {
    try {
      const ready = await this.page.evaluate(() => {
        return "Translator" in window && typeof (window as any).Translator?.create === "function";
      });
      return ready;
    } catch (error) {
      console.error("Error checking translator readiness:", error);
      return false;
    }
  }

  /**
   * Translate a single text
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      // Validate input
      if (!request.text || request.text.trim() === "") {
        return {
          translatedText: "",
          originalText: request.text,
          success: false,
          error: "Empty text provided for translation",
        };
      }

      // Prepare text with context if requested
      const textToTranslate = request.withContext ? this.config.contextTemplate.replace("{text}", request.text) : request.text;

      // Check if text is too long (Chrome Translator has limits)
      if (textToTranslate.length > 5000) {
        return {
          translatedText: "",
          originalText: request.text,
          success: false,
          error: "Text too long for translation (>5000 characters)",
        };
      }

      // Perform translation with error handling
      const translatedText = await this.page.evaluate(async (text) => {
        try {
          if (!(window as any).Translator || typeof (window as any).Translator.create !== "function") {
            throw new Error("Translator API not available");
          }

          const translator = await (window as any).Translator.create({
            sourceLanguage: "en",
            targetLanguage: "ja",
          });

          // Check if translator is ready
          if (!translator) {
            throw new Error("Failed to create translator instance");
          }

          const result = await translator.translate(text);

          if (!result || typeof result !== "string") {
            throw new Error("Invalid translation result");
          }

          return result;
        } catch (browserError) {
          const errorMessage = browserError instanceof Error ? browserError.message : "Unknown browser error";
          throw new Error(`Browser translation error: ${errorMessage}`);
        }
      }, textToTranslate);

      // Validate translation result
      if (!translatedText || typeof translatedText !== "string") {
        return {
          translatedText: "",
          originalText: request.text,
          success: false,
          error: "Empty or invalid translation result",
        };
      }

      // Remove context from result if it was added
      const finalText = request.withContext ? this.removeContextFromTranslation(translatedText) : translatedText;

      // Final validation
      if (!finalText || finalText.trim() === "") {
        return {
          translatedText: "",
          originalText: request.text,
          success: false,
          error: "Translation result is empty after context removal",
        };
      }

      return {
        translatedText: finalText,
        originalText: request.text,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Translation error for "${request.text}":`, errorMessage);

      return {
        translatedText: "",
        originalText: request.text,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Translate multiple texts with retry logic
   */
  async translateBatch(requests: TranslationRequest[]): Promise<TranslationResponse[]> {
    const results: TranslationResponse[] = [];

    for (const request of requests) {
      let result: TranslationResponse | null = null;
      let attempts = 0;
      let lastError: string = "";

      while (attempts < this.config.retryCount && (!result || !result.success)) {
        try {
          result = await this.translate(request);
          if (result.success) {
            break;
          } else {
            lastError = result.error || "Translation failed";
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Unknown error";
          console.error(`Translation attempt ${attempts + 1} failed for "${request.text}":`, lastError);
        }

        attempts++;
        if (attempts < this.config.retryCount) {
          // Exponential backoff
          const backoffDelay = this.config.retryDelay * Math.pow(2, attempts - 1);
          await this.delay(backoffDelay);
        }
      }

      if (!result || !result.success) {
        result = {
          translatedText: "",
          originalText: request.text,
          success: false,
          error: `All ${this.config.retryCount} retry attempts failed. Last error: ${lastError}`,
        };
      }

      results.push(result);

      // Add small delay between translations to avoid rate limiting
      await this.delay(100);
    }

    return results;
  }

  /**
   * Remove context information from translated text
   */
  private removeContextFromTranslation(translatedText: string): string {
    // Remove the Japanese context prefix
    const contextPrefixes = [
      "システム・ソフトウェア開発の専門用語としての文脈における用語の説明：",
      "システム・ソフトウェア開発の専門用語としての文脈における用語の説明:",
      "システム・ソフトウェア開発の専門用語としての文脈における用語の説明 :",
      "システム・ソフトウェア開発の専門用語としての文脈における用語の説明 ：",
    ];

    let cleanedText = translatedText;
    for (const prefix of contextPrefixes) {
      if (cleanedText.startsWith(prefix)) {
        cleanedText = cleanedText.substring(prefix.length).trim();
        break;
      }
    }

    return cleanedText;
  }

  /**
   * Create translation request with context
   */
  createContextRequest(text: string): TranslationRequest {
    return {
      text,
      withContext: true,
      context: {
        prefix: "システム・ソフトウェア開発の専門用語としての文脈における用語の説明：",
        suffix: "",
      },
    };
  }

  /**
   * Create simple translation request without context
   */
  createSimpleRequest(text: string): TranslationRequest {
    return {
      text,
      withContext: false,
    };
  }

  /**
   * Get translation configuration
   */
  getConfig(): TranslationConfig {
    return { ...this.config };
  }

  /**
   * Update translation configuration
   */
  updateConfig(config: Partial<TranslationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if translator is properly initialized
   */
  isInitialized(): boolean {
    return this.translatorInstance !== null;
  }

  /**
   * Clean up translator resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.translatorInstance) {
        // Chrome Translator API doesn't require explicit cleanup
        this.translatorInstance = null;
      }
      console.log("Chrome Translator cleaned up successfully");
    } catch (error) {
      console.error("Error during translator cleanup:", error);
    }
  }
}
