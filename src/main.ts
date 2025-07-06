import { promises as fs } from "fs";
import { initializeBrowser } from "./browser-init.ts";
import { translateWordsBatch } from "./translate.ts";
import type { Word } from "./types.ts";

/**
 * Main application for ISO 24765 terminology translation
 */
class ISO24765Translator {
  private parseArgs(): { inputPath: string; outputPath: string } {
    const args = process.argv.slice(2);
    return {
      inputPath: args[0] || "input/iso24765-terminology.json",
      outputPath: args[1] || "output/iso24765-translated-terminology.json",
    };
  }

  private async executeTranslate(inputPath: string, outputPath: string): Promise<void> {
    let context: any = null;

    try {
      const data = await fs.readFile(inputPath, "utf-8");
      const words: Word[] = JSON.parse(data);
      console.log(`Loaded ${words.length} terms`);

      const browser = await initializeBrowser();
      context = browser.context;

      console.log("Starting batch translation...");
      const results = await translateWordsBatch(browser.page, words);

      await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
      console.log(`Completed! Processed ${results.length} terms`);
    } catch (error) {
      console.error("Translation failed:", error);
      throw error;
    } finally {
      if (context) {
        await context.close();
      }
    }
  }

  async run(): Promise<void> {
    try {
      const args = this.parseArgs();
      await this.executeTranslate(args.inputPath, args.outputPath);
    } catch (error) {
      console.error("Application error:", error);
      process.exit(1);
    }
  }
}

// Run the application
const app = new ISO24765Translator();
app.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
