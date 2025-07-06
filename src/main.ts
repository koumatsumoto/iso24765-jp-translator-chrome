import { promises as fs } from "fs";
import { TranslationProcessor } from "./processor.ts";
import { TranslationValidator } from "./validator.ts";

/**
 * Main application for ISO 24765 terminology translation
 */
class ISO24765Translator {
  private processor: TranslationProcessor;
  private validator: TranslationValidator;

  constructor() {
    this.processor = new TranslationProcessor({
      batchSize: 5, // Start with small batch size for stability
      retryCount: 3,
      retryDelay: 2000,
    });
    this.validator = new TranslationValidator();
  }

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
    try {
      console.log("Starting ISO 24765 terminology translation...");
      console.log(`Input: ${inputPath}`);
      console.log(`Output: ${outputPath}`);

      // Check if input file exists
      await fs.access(inputPath);

      // Initialize processor
      await this.processor.initialize();

      // Process translation
      await this.processor.processTranslation(inputPath, outputPath);

      console.log("Translation completed successfully!");
    } catch (error) {
      console.error("Translation failed:", error);
      throw error;
    } finally {
      await this.processor.cleanup();
    }
  }

  /**
   * Execute resume command
   */
  private async executeResume(backupPath: string, inputPath: string, outputPath: string): Promise<void> {
    try {
      console.log("Resuming ISO 24765 terminology translation...");
      console.log(`Backup: ${backupPath}`);
      console.log(`Input: ${inputPath}`);
      console.log(`Output: ${outputPath}`);

      // Check if files exist
      await fs.access(backupPath);
      await fs.access(inputPath);

      // Initialize processor
      await this.processor.initialize();

      // Resume translation
      await this.processor.resumeTranslation(backupPath, inputPath, outputPath);

      console.log("Resume translation completed successfully!");
    } catch (error) {
      console.error("Resume translation failed:", error);
      throw error;
    } finally {
      await this.processor.cleanup();
    }
  }

  /**
   * Execute validation command
   */
  private async executeValidate(inputPath: string, translatedPath: string, reportPath: string): Promise<void> {
    try {
      console.log("Validating translation quality...");
      console.log(`Original: ${inputPath}`);
      console.log(`Translated: ${translatedPath}`);
      console.log(`Report: ${reportPath}`);

      // Check if files exist
      await fs.access(inputPath);
      await fs.access(translatedPath);

      // Validate translation
      const result = await this.validator.validateFromFiles(inputPath, translatedPath);

      // Generate and save report
      await this.validator.saveReport(result, reportPath);

      // Print summary
      console.log("\n=== Validation Summary ===");
      console.log(`Status: ${result.isValid ? "VALID" : "INVALID"}`);
      console.log(`Errors: ${result.errors.length}`);
      console.log(`Warnings: ${result.warnings.length}`);
      console.log(
        `Completion Rate: ${(((result.statistics.translatedWords - result.statistics.emptyTranslations) / result.statistics.totalWords) * 100).toFixed(1)}%`,
      );
      console.log(`Report saved to: ${reportPath}`);

      if (!result.isValid) {
        console.log("\nFirst 5 errors:");
        result.errors.slice(0, 5).forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
    } catch (error) {
      console.error("Validation failed:", error);
      throw error;
    }
  }

  /**
   * Handle process signals for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Performing graceful shutdown...`);
      try {
        await this.processor.cleanup();
        console.log("Cleanup completed.");
        process.exit(0);
      } catch (error) {
        console.error("Error during cleanup:", error);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  }

  /**
   * Run the application
   */
  async run(): Promise<void> {
    try {
      // Setup signal handlers
      this.setupSignalHandlers();

      // Parse command line arguments
      const args = this.parseArgs();

      // Execute command
      switch (args.command) {
        case "translate":
          await this.executeTranslate(args.inputPath, args.outputPath);
          break;

        case "resume":
          await this.executeResume(args.backupPath!, args.inputPath, args.outputPath);
          break;

        case "validate":
          await this.executeValidate(args.inputPath, args.outputPath, args.reportPath!);
          break;
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
