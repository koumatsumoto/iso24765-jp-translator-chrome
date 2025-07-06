import { promises as fs } from "fs";
import type { Word, TranslatedWord, ValidationResult } from "./types.ts";

/**
 * Validator for translation quality and data integrity
 */
export class TranslationValidator {
  /**
   * Validate translated terminology data
   */
  async validateTranslation(originalData: Word[], translatedData: TranslatedWord[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    const structureResult = this.validateStructure(originalData, translatedData);
    errors.push(...structureResult.errors);
    warnings.push(...structureResult.warnings);

    // Content validation
    const contentResult = this.validateContent(translatedData);
    errors.push(...contentResult.errors);
    warnings.push(...contentResult.warnings);

    // Translation completeness validation
    const completenessResult = this.validateCompleteness(originalData, translatedData);
    errors.push(...completenessResult.errors);
    warnings.push(...completenessResult.warnings);

    // Quality validation
    const qualityResult = this.validateQuality(translatedData);
    errors.push(...qualityResult.errors);
    warnings.push(...qualityResult.warnings);

    // Calculate statistics
    const statistics = this.calculateStatistics(originalData, translatedData);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      statistics,
    };
  }

  /**
   * Validate data structure integrity
   */
  private validateStructure(originalData: Word[], translatedData: TranslatedWord[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check array lengths
    if (originalData.length !== translatedData.length) {
      errors.push(`Data length mismatch: original has ${originalData.length} terms, translated has ${translatedData.length} terms`);
    }

    // Check for missing terms
    const originalNumbers = new Set(originalData.map((word) => word.number));
    const translatedNumbers = new Set(translatedData.map((word) => word.number));

    for (const number of originalNumbers) {
      if (!translatedNumbers.has(number)) {
        errors.push(`Missing translated term: ${number}`);
      }
    }

    // Check for extra terms
    for (const number of translatedNumbers) {
      if (!originalNumbers.has(number)) {
        warnings.push(`Extra translated term found: ${number}`);
      }
    }

    // Validate each translated word structure
    for (const translatedWord of translatedData) {
      const structureErrors = this.validateWordStructure(translatedWord);
      errors.push(...structureErrors);
    }

    return { errors, warnings };
  }

  /**
   * Validate individual word structure
   */
  private validateWordStructure(word: TranslatedWord): string[] {
    const errors: string[] = [];

    // Required fields
    if (!word.number) {
      errors.push(`Word missing number field`);
    }
    if (!word.name) {
      errors.push(`Word ${word.number || "unknown"} missing name field`);
    }
    if (!word.name_ja) {
      errors.push(`Word ${word.number || "unknown"} missing name_ja field`);
    }
    if (!word.definitions || !Array.isArray(word.definitions) || word.definitions.length === 0) {
      errors.push(`Word ${word.number || "unknown"} missing or empty definitions`);
    }

    // Validate definitions
    if (word.definitions) {
      for (let i = 0; i < word.definitions.length; i++) {
        const def = word.definitions[i];
        if (def && !def.text) {
          errors.push(`Word ${word.number} definition ${i + 1} missing text`);
        }
        if (def && !def.text_ja) {
          errors.push(`Word ${word.number} definition ${i + 1} missing text_ja`);
        }
      }
    }

    // Validate optional fields consistency
    if (word.alias && (!word.alias_ja || word.alias.length !== word.alias_ja.length)) {
      errors.push(`Word ${word.number} alias and alias_ja length mismatch`);
    }
    if (word.confer && (!word.confer_ja || word.confer.length !== word.confer_ja.length)) {
      errors.push(`Word ${word.number} confer and confer_ja length mismatch`);
    }
    if (word.example && !word.example_ja) {
      errors.push(`Word ${word.number} has example but missing example_ja`);
    }
    if (word.note && !word.note_ja) {
      errors.push(`Word ${word.number} has note but missing note_ja`);
    }

    return errors;
  }

  /**
   * Validate content quality
   */
  private validateContent(translatedData: TranslatedWord[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const word of translatedData) {
      // Check for empty translations
      if (word.name_ja.trim() === "") {
        errors.push(`Word ${word.number} has empty name_ja`);
      }

      // Check if translation is identical to original (might indicate failure)
      if (word.name_ja === word.name) {
        warnings.push(`Word ${word.number} name_ja identical to original name: "${word.name}"`);
      }

      // Check definitions
      for (let i = 0; i < word.definitions.length; i++) {
        const def = word.definitions[i];
        if (def && def.text_ja && def.text_ja.trim() === "") {
          errors.push(`Word ${word.number} definition ${i + 1} has empty text_ja`);
        }
        if (def && def.text_ja === def.text) {
          warnings.push(`Word ${word.number} definition ${i + 1} text_ja identical to original text`);
        }
      }

      // Check for suspicious characters or patterns
      const suspiciousPatterns = this.checkSuspiciousPatterns(word);
      warnings.push(...suspiciousPatterns);
    }

    return { errors, warnings };
  }

  /**
   * Check for suspicious translation patterns
   */
  private checkSuspiciousPatterns(word: TranslatedWord): string[] {
    const warnings: string[] = [];

    // Check for context prefix remnants
    const contextPrefixes = [
      "システム・ソフトウェア開発の専門用語としての文脈における用語の説明",
      "システム・ソフトウェア開発",
      "専門用語としての文脈",
    ];

    for (const prefix of contextPrefixes) {
      if (word.name_ja.includes(prefix)) {
        warnings.push(`Word ${word.number} name_ja contains context prefix remnant`);
      }
    }

    // Check for very long translations (might indicate concatenation errors)
    if (word.name_ja.length > word.name.length * 3) {
      warnings.push(`Word ${word.number} name_ja unusually long compared to original`);
    }

    // Check for HTML entities or special characters
    if (word.name_ja.includes("&") || word.name_ja.includes("<") || word.name_ja.includes(">")) {
      warnings.push(`Word ${word.number} name_ja contains HTML entities or special characters`);
    }

    return warnings;
  }

  /**
   * Validate translation completeness
   */
  private validateCompleteness(originalData: Word[], translatedData: TranslatedWord[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Create lookup map for translated data
    const translatedMap = new Map<string, TranslatedWord>();
    for (const word of translatedData) {
      translatedMap.set(word.number, word);
    }

    // Check completeness for each original word
    for (const originalWord of originalData) {
      const translatedWord = translatedMap.get(originalWord.number);
      if (!translatedWord) {
        errors.push(`Missing translation for word ${originalWord.number}`);
        continue;
      }

      // Check field completeness
      if (originalWord.alias && !translatedWord.alias_ja) {
        warnings.push(`Word ${originalWord.number} original has alias but translation is missing alias_ja`);
      }
      if (originalWord.confer && !translatedWord.confer_ja) {
        warnings.push(`Word ${originalWord.number} original has confer but translation is missing confer_ja`);
      }
      if (originalWord.example && !translatedWord.example_ja) {
        warnings.push(`Word ${originalWord.number} original has example but translation is missing example_ja`);
      }
      if (originalWord.note && !translatedWord.note_ja) {
        warnings.push(`Word ${originalWord.number} original has note but translation is missing note_ja`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate translation quality based on heuristics
   */
  private validateQuality(translatedData: TranslatedWord[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate translations
    const translationCounts = new Map<string, string[]>();
    for (const word of translatedData) {
      const translation = word.name_ja.toLowerCase().trim();
      if (!translationCounts.has(translation)) {
        translationCounts.set(translation, []);
      }
      translationCounts.get(translation)!.push(word.number);
    }

    // Report duplicates
    for (const [translation, numbers] of translationCounts) {
      if (numbers.length > 1 && translation !== "") {
        warnings.push(`Duplicate translation "${translation}" found in words: ${numbers.join(", ")}`);
      }
    }

    // Check for very short translations (might be incomplete)
    for (const word of translatedData) {
      if (word.name_ja.length < 2 && word.name.length > 5) {
        warnings.push(`Word ${word.number} has very short translation: "${word.name_ja}"`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Calculate translation statistics
   */
  private calculateStatistics(originalData: Word[], translatedData: TranslatedWord[]) {
    const totalWords = originalData.length;
    const translatedWords = translatedData.length;

    let missingTranslations = 0;
    let emptyTranslations = 0;

    const translatedMap = new Map<string, TranslatedWord>();
    for (const word of translatedData) {
      translatedMap.set(word.number, word);
    }

    for (const originalWord of originalData) {
      const translatedWord = translatedMap.get(originalWord.number);
      if (!translatedWord) {
        missingTranslations++;
      } else if (!translatedWord.name_ja || translatedWord.name_ja.trim() === "") {
        emptyTranslations++;
      }
    }

    return {
      totalWords,
      translatedWords,
      missingTranslations,
      emptyTranslations,
    };
  }

  /**
   * Generate validation report
   */
  generateReport(result: ValidationResult): string {
    let report = "=== Translation Validation Report ===\n\n";

    // Overall status
    report += `Status: ${result.isValid ? "VALID" : "INVALID"}\n`;
    report += `Total Errors: ${result.errors.length}\n`;
    report += `Total Warnings: ${result.warnings.length}\n\n`;

    // Statistics
    report += "=== Statistics ===\n";
    report += `Total Words: ${result.statistics.totalWords}\n`;
    report += `Translated Words: ${result.statistics.translatedWords}\n`;
    report += `Missing Translations: ${result.statistics.missingTranslations}\n`;
    report += `Empty Translations: ${result.statistics.emptyTranslations}\n`;

    const completionRate = ((result.statistics.translatedWords - result.statistics.emptyTranslations) / result.statistics.totalWords) * 100;
    report += `Completion Rate: ${completionRate.toFixed(1)}%\n\n`;

    // Errors
    if (result.errors.length > 0) {
      report += "=== Errors ===\n";
      result.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += "\n";
    }

    // Warnings
    if (result.warnings.length > 0) {
      report += "=== Warnings ===\n";
      result.warnings.slice(0, 50).forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      if (result.warnings.length > 50) {
        report += `... and ${result.warnings.length - 50} more warnings\n`;
      }
      report += "\n";
    }

    return report;
  }

  /**
   * Save validation report to file
   */
  async saveReport(result: ValidationResult, filePath: string): Promise<void> {
    const report = this.generateReport(result);
    await fs.writeFile(filePath, report, "utf-8");
  }

  /**
   * Validate from files
   */
  async validateFromFiles(originalPath: string, translatedPath: string): Promise<ValidationResult> {
    try {
      const originalData = JSON.parse(await fs.readFile(originalPath, "utf-8"));
      const translatedData = JSON.parse(await fs.readFile(translatedPath, "utf-8"));

      return await this.validateTranslation(originalData, translatedData);
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to load or parse files: ${error instanceof Error ? error.message : "Unknown error"}`],
        warnings: [],
        statistics: {
          totalWords: 0,
          translatedWords: 0,
          missingTranslations: 0,
          emptyTranslations: 0,
        },
      };
    }
  }
}
