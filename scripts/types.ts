/**
 * Interface representing a word entry with its number, name and content lines
 */
export interface WordEntry {
  number: string;
  name: string;
  contentLines: string[];
}

/**
 * Interface representing a definition with text and optional reference
 */
export interface WordDefinition {
  text: string;
  reference?: string | undefined;
}

/**
 * Interface representing processed word content
 */
export interface WordContent {
  definition?: string;
  alias?: [string, ...string[]];
  confer?: string;
  example?: string | undefined;
  note?: string | undefined;
}

/**
 * Interface representing final output word data
 */
export interface Word {
  number: WordEntry["number"];
  name: WordEntry["name"];
  alias?: [string, ...string[]];
  definitions: WordDefinition[];
  confer?: [string, ...string[]];
  example?: string | undefined;
  note?: string | undefined;
}
