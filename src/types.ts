/**
 * Interface representing final output word data
 */
export interface Word {
  number: string;
  name: string;
  alias?: [string, ...string[]];
  definitions: {
    text: string;
    reference?: string | undefined;
  }[];
  confer?: [string, ...string[]];
  example?: string | undefined;
  note?: string | undefined;
}

/**
 * Interface representing translated word data
 */
export interface TranslatedWord {
  number: string;
  name: string;
  name_ja: string;
  alias?: [string, ...string[]];
  alias_ja?: [string, ...string[]];
  definitions: {
    text: string;
    text_ja: string;
    reference?: string | undefined;
  }[];
  confer?: [string, ...string[]];
  confer_ja?: [string, ...string[]];
  example?: string | undefined;
  example_ja?: string | undefined;
  note?: string | undefined;
  note_ja?: string | undefined;
}

/**
 * Translation context configuration
 */
export interface TranslationContext {
  prefix: string;
  suffix: string;
}

/**
 * Translation request data
 */
export interface TranslationRequest {
  text: string;
  withContext: boolean;
  context?: TranslationContext;
}

/**
 * Translation response from Chrome Translator API
 */
export interface TranslationResponse {
  translatedText: string;
  originalText: string;
  success: boolean;
  error?: string;
}

/**
 * Translation processing status
 */
export interface TranslationStatus {
  total: number;
  completed: number;
  failed: number;
  progress: number;
  currentWord?: string;
  errors: string[];
}

/**
 * Translation configuration
 */
export interface TranslationConfig {
  batchSize: number;
  retryCount: number;
  retryDelay: number;
  contextTemplate: string;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Browser configuration for Playwright
 */
export interface BrowserConfig {
  headless: boolean;
  timeout: number;
  viewport: {
    width: number;
    height: number;
  };
  locale: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    totalWords: number;
    translatedWords: number;
    missingTranslations: number;
    emptyTranslations: number;
  };
}
