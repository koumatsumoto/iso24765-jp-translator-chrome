import { promises as fs } from "fs";
import { initializeBrowser } from "./browser-init.ts";
import { translateText } from "./translate.ts";
import type { Word, TranslatedWord } from "./types.ts";

/**
 * Main application for ISO 24765 terminology translation
 */
class ISO24765Translator {
  /**
   * Parse command line arguments
   */
  private parseArgs(): {
    command: string;
    inputPath: string;
    outputPath: string;
    backupPath?: string;
    reportPath?: string;
  } {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      this.showUsage();
      process.exit(1);
    }

    const command = args[0];

    switch (command) {
      case "translate":
        return {
          command,
          inputPath: args[1] || "input/iso24765-terminology.json",
          outputPath: args[2] || "output/iso24765-translated-terminology.json",
        };

      case "resume":
        if (args.length < 2) {
          console.error("Resume command requires backup file path");
          process.exit(1);
        }
        return {
          command,
          backupPath: args[1] as string,
          inputPath: args[2] || "input/iso24765-terminology.json",
          outputPath: args[3] || "output/iso24765-translated-terminology.json",
        };

      case "validate":
        return {
          command,
          inputPath: args[1] || "input/iso24765-terminology.json",
          outputPath: args[2] || "output/iso24765-translated-terminology.json",
          reportPath: args[3] || "output/validation-report.txt",
        };

      default:
        console.error(`Unknown command: ${command}`);
        this.showUsage();
        process.exit(1);
    }
  }

  /**
   * Show usage information
   */
  private showUsage(): void {
    console.log(`
ISO 24765 Chrome Translator

Usage:
  node src/main.ts translate [input] [output]
    Translate terminology from input JSON to output JSON
    Default: input/iso24765-terminology.json -> output/iso24765-translated-terminology.json
  
  node src/main.ts resume <backup> [input] [output]
    Resume translation from backup file
    
  node src/main.ts validate [input] [translated] [report]
    Validate translation quality and generate report
    Default report: output/validation-report.txt

Examples:
  node src/main.ts translate
  node src/main.ts translate input/terms.json output/translated.json
  node src/main.ts resume output/iso24765-translated-terminology.backup-100.json
  node src/main.ts validate
    `);
  }

  /**
   * Execute translation command
   */
  private async executeTranslate(inputPath: string, outputPath: string): Promise<void> {
    let context: any = null;
    let page: any = null;

    try {
      console.log("Starting ISO 24765 terminology translation...");
      console.log(`Input: ${inputPath}`);
      console.log(`Output: ${outputPath}`);

      // Load input data
      const data = await fs.readFile(inputPath, "utf-8");
      const words: Word[] = JSON.parse(data);
      console.log(`Loaded ${words.length} terms`);

      // Initialize browser
      const browser = await initializeBrowser();
      context = browser.context;
      page = browser.page;

      const results: TranslatedWord[] = [];

      // Process each word
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word) continue;
        console.log(`Processing ${i + 1}/${words.length}: ${word.name}`);

        try {
          const translated: TranslatedWord = {
            number: word.number,
            name: word.name,
            name_ja: await translateText(page, word.name),
            definitions: [],
          };

          // Translate definitions
          for (const def of word.definitions) {
            translated.definitions.push({
              text: def.text,
              text_ja: await translateText(page, def.text),
              reference: def.reference,
            });
          }

          results.push(translated);

          // Save backup every 100 items
          if (i % 100 === 0 && i > 0) {
            const backupPath = outputPath.replace(".json", `.backup-${i}.json`);
            await fs.writeFile(backupPath, JSON.stringify(results, null, 2));
            console.log(`Backup saved: ${backupPath}`);
          }

          // Small delay
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to translate ${word.name}:`, error);
          // Add fallback
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

      // Save final result
      await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
      console.log("Translation completed successfully!");
    } catch (error) {
      console.error("Translation failed:", error);
      throw error;
    } finally {
      if (context) {
        await context.close();
      }
    }
  }

  /**
   * Run the application
   */
  async run(): Promise<void> {
    try {
      const args = this.parseArgs();

      if (args.command === "translate") {
        await this.executeTranslate(args.inputPath, args.outputPath);
      } else {
        console.error("Only translate command is supported");
        process.exit(1);
      }
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
