import * as fs from "fs";
import * as path from "path";

interface ValidationResult {
  isValid: boolean;
  totalLines: number;
  validEntries: number;
  invalidEntries: number;
  errors: string[];
}

function validateWordStructure(word: any, lineNumber: number): string[] {
  const errors: string[] = [];

  if (typeof word !== "object" || word === null) {
    errors.push(`Line ${lineNumber}: Entry is not an object`);
    return errors;
  }

  // Check required fields
  if (typeof word.number !== "string") {
    errors.push(`Line ${lineNumber}: Missing or invalid 'number' field`);
  }

  if (typeof word.name !== "string") {
    errors.push(`Line ${lineNumber}: Missing or invalid 'name' field`);
  }

  if (!Array.isArray(word.definitions)) {
    errors.push(`Line ${lineNumber}: Missing or invalid 'definitions' field (must be array)`);
  } else {
    // Validate each definition
    word.definitions.forEach((def: any, index: number) => {
      if (typeof def !== "object" || def === null) {
        errors.push(`Line ${lineNumber}: Definition ${index} is not an object`);
      } else if (typeof def.text !== "string") {
        errors.push(`Line ${lineNumber}: Definition ${index} missing or invalid 'text' field`);
      }
    });
  }

  // Check optional fields if they exist
  if (word.alias !== undefined) {
    if (!Array.isArray(word.alias) || word.alias.length === 0) {
      errors.push(`Line ${lineNumber}: 'alias' field must be a non-empty array if present`);
    } else {
      word.alias.forEach((alias: any, index: number) => {
        if (typeof alias !== "string") {
          errors.push(`Line ${lineNumber}: Alias ${index} must be a string`);
        }
      });
    }
  }

  if (word.confer !== undefined) {
    if (!Array.isArray(word.confer) || word.confer.length === 0) {
      errors.push(`Line ${lineNumber}: 'confer' field must be a non-empty array if present`);
    } else {
      word.confer.forEach((confer: any, index: number) => {
        if (typeof confer !== "string") {
          errors.push(`Line ${lineNumber}: Confer ${index} must be a string`);
        }
      });
    }
  }

  if (word.example !== undefined && typeof word.example !== "string") {
    errors.push(`Line ${lineNumber}: 'example' field must be a string if present`);
  }

  if (word.note !== undefined && typeof word.note !== "string") {
    errors.push(`Line ${lineNumber}: 'note' field must be a string if present`);
  }

  return errors;
}

async function validateJsonl(inputPath: string, originalJsonPath?: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    totalLines: 0,
    validEntries: 0,
    invalidEntries: 0,
    errors: [],
  };

  try {
    console.log(`Validating JSONL file: ${inputPath}`);

    const inputData = await fs.promises.readFile(inputPath, "utf-8");
    const lines = inputData.split("\n").filter((line) => line.trim() !== "");

    result.totalLines = lines.length;
    console.log(`Found ${result.totalLines} lines to validate`);

    // Compare with original JSON if provided
    if (originalJsonPath) {
      try {
        const originalData = await fs.promises.readFile(originalJsonPath, "utf-8");
        const originalJson = JSON.parse(originalData);

        if (Array.isArray(originalJson)) {
          const expectedCount = originalJson.length;
          console.log(`Original JSON has ${expectedCount} entries`);

          if (result.totalLines !== expectedCount) {
            result.errors.push(`Entry count mismatch: JSONL has ${result.totalLines} entries, original JSON has ${expectedCount}`);
            result.isValid = false;
          }
        }
      } catch (error) {
        result.errors.push(`Failed to read original JSON file: ${error instanceof Error ? error.message : "Unknown error"}`);
        result.isValid = false;
      }
    }

    // Validate each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const lineNumber = i + 1;

      try {
        const parsedEntry = JSON.parse(line);
        const structureErrors = validateWordStructure(parsedEntry, lineNumber);

        if (structureErrors.length > 0) {
          result.errors.push(...structureErrors);
          result.invalidEntries++;
          result.isValid = false;
        } else {
          result.validEntries++;
        }
      } catch (error) {
        result.errors.push(`Line ${lineNumber}: Invalid JSON format - ${error instanceof Error ? error.message : "Unknown error"}`);
        result.invalidEntries++;
        result.isValid = false;
      }

      // Progress reporting
      if (lineNumber % 500 === 0) {
        console.log(`Validated ${lineNumber}/${result.totalLines} entries (${Math.round((lineNumber / result.totalLines) * 100)}%)`);
      }
    }

    console.log(`\nValidation completed!`);
    console.log(`Total lines: ${result.totalLines}`);
    console.log(`Valid entries: ${result.validEntries}`);
    console.log(`Invalid entries: ${result.invalidEntries}`);
    console.log(`Status: ${result.isValid ? "VALID" : "INVALID"}`);

    if (result.errors.length > 0) {
      console.log(`\nErrors found:`);
      result.errors.forEach((error) => console.log(`- ${error}`));
    }
  } catch (error) {
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        result.errors.push(`Input file not found: ${inputPath}`);
      } else if (nodeError.code === "EACCES") {
        result.errors.push(`Permission denied accessing file: ${inputPath}`);
      } else {
        result.errors.push(`Error reading file: ${error.message}`);
      }
    } else {
      result.errors.push(`Unexpected error: ${error}`);
    }
    result.isValid = false;
  }

  return result;
}

async function main(): Promise<void> {
  const jsonlPath = path.resolve("output/iso24765-terminology.jsonl");
  const originalJsonPath = path.resolve("input/iso24765-terminology.json");

  try {
    const result = await validateJsonl(jsonlPath, originalJsonPath);

    if (!result.isValid) {
      console.error("\nValidation failed!");
      process.exit(1);
    } else {
      console.log("\nValidation successful!");
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1] || ""}`) {
  main();
}

export { validateJsonl, validateWordStructure };
