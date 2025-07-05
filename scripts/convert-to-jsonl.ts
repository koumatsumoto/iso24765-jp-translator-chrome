import * as fs from "fs";
import * as path from "path";
import type { Word } from "./types.js";

async function convertJsonToJsonl(inputPath: string, outputPath: string): Promise<void> {
  try {
    console.log(`Reading input file: ${inputPath}`);

    const inputData = await fs.promises.readFile(inputPath, "utf-8");

    let jsonData: Word[];
    try {
      jsonData = JSON.parse(inputData);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    if (!Array.isArray(jsonData)) {
      throw new Error("Input JSON must be an array");
    }

    console.log(`Converting ${jsonData.length} entries to JSONL format...`);

    const outputStream = fs.createWriteStream(outputPath);
    let processedCount = 0;

    for (const entry of jsonData) {
      try {
        const jsonLine = JSON.stringify(entry);
        outputStream.write(jsonLine + "\n");
        processedCount++;

        if (processedCount % 100 === 0) {
          console.log(`Processed ${processedCount}/${jsonData.length} entries (${Math.round((processedCount / jsonData.length) * 100)}%)`);
        }
      } catch (error) {
        console.error(`Error processing entry ${processedCount + 1}:`, error);
        throw new Error(`Failed to serialize entry ${processedCount + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    outputStream.end();

    await new Promise<void>((resolve, reject) => {
      outputStream.on("finish", resolve);
      outputStream.on("error", reject);
    });

    console.log(`\nConversion completed successfully!`);
    console.log(`Input: ${inputPath}`);
    console.log(`Output: ${outputPath}`);
    console.log(`Total entries processed: ${processedCount}`);
  } catch (error) {
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        throw new Error(`Input file not found: ${inputPath}`);
      } else if (nodeError.code === "EACCES") {
        throw new Error(`Permission denied accessing file: ${inputPath}`);
      } else {
        throw error;
      }
    }
    throw new Error(`Unexpected error: ${error}`);
  }
}

async function main(): Promise<void> {
  const inputPath = path.resolve("input/iso24765-terminology.json");
  const outputPath = path.resolve("output/iso24765-terminology.jsonl");

  try {
    await convertJsonToJsonl(inputPath, outputPath);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1] || ""}`) {
  main();
}

export { convertJsonToJsonl };
