import { chromium } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import type { BrowserConfig } from "./types.ts";

/**
 * Browser manager for Chrome Translator API operations
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserConfig;

  constructor(config: Partial<BrowserConfig> = {}) {
    this.config = {
      headless: false, // Need to be visible for Translator API
      timeout: 30000,
      viewport: {
        width: 1280,
        height: 720,
      },
      locale: "en-US",
      ...config,
    };
  }

  /**
   * Initialize browser with Chrome and enable Translator API
   */
  async initialize(): Promise<void> {
    try {
      // Launch Chromium browser
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          "--enable-experimental-web-platform-features",
          "--enable-features=TranslationAPI",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--no-sandbox",
          "--disable-dev-shm-usage",
        ],
      });

      // Create browser context
      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        locale: this.config.locale,
      });

      // Create page
      this.page = await this.context.newPage();

      // Set timeout
      this.page.setDefaultTimeout(this.config.timeout);

      // Navigate to a blank page to initialize
      await this.page.goto("about:blank");

      console.log("Browser initialized successfully");
    } catch (error) {
      console.error("Failed to initialize browser:", error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Get the current page instance
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }
    return this.page;
  }

  /**
   * Check if Translator API is available
   */
  async isTranslatorAPIAvailable(): Promise<boolean> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      const isAvailable = await this.page.evaluate(() => {
        return "translation" in window && "createTranslator" in (window as any).translation;
      });
      return isAvailable;
    } catch (error) {
      console.error("Error checking Translator API availability:", error);
      return false;
    }
  }

  /**
   * Get Chrome version
   */
  async getChromeVersion(): Promise<string> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      const version = await this.page.evaluate(() => {
        return navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)?.[1] || "unknown";
      });
      return version;
    } catch (error) {
      console.error("Error getting Chrome version:", error);
      return "unknown";
    }
  }

  /**
   * Execute JavaScript code in the browser context
   */
  async executeScript<T>(script: string | ((page: Page) => Promise<T>)): Promise<T> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      if (typeof script === "string") {
        return await this.page.evaluate(script);
      } else {
        return await script(this.page);
      }
    } catch (error) {
      console.error("Error executing script:", error);
      throw error;
    }
  }

  /**
   * Wait for a specific condition to be true
   */
  async waitForCondition(condition: () => Promise<boolean> | boolean, options: { timeout?: number; interval?: number } = {}): Promise<void> {
    const { timeout = 10000, interval = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        if (await condition()) {
          return;
        }
      } catch (error) {
        // Ignore errors during condition check
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Clean up browser resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.log("Browser cleaned up successfully");
    } catch (error) {
      console.error("Error during browser cleanup:", error);
    }
  }

  /**
   * Check if browser is initialized
   */
  isInitialized(): boolean {
    return this.browser !== null && this.context !== null && this.page !== null;
  }

  /**
   * Get browser configuration
   */
  getConfig(): BrowserConfig {
    return { ...this.config };
  }
}
