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
   * Find Chrome executable path
   */
  private async findChromeExecutable(): Promise<string | null> {
    const chromePaths = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/opt/google/chrome/google-chrome",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Windows
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe", // Windows 32-bit
    ];

    for (const path of chromePaths) {
      try {
        const { promises: fs } = await import("fs");
        await fs.access(path);
        return path;
      } catch {
        // File doesn't exist, try next path
      }
    }

    return null;
  }

  /**
   * Initialize browser with Chrome and enable Translator API
   */
  async initialize(): Promise<void> {
    try {
      // Find Chrome executable
      const chromeExecutable = await this.findChromeExecutable();

      if (chromeExecutable) {
        console.log(`Using Chrome executable: ${chromeExecutable}`);
      } else {
        console.log("Chrome executable not found, using Playwright's Chromium");
      }

      // Launch Chrome browser (use system Chrome if found, otherwise Playwright's Chromium)
      const launchOptions = {
        headless: this.config.headless,
        args: [
          "--enable-experimental-web-platform-features",
          "--enable-features=TranslationAPI",
          "--enable-blink-features=TranslationAPI",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-blink-features=AutomationControlled",
          "--disable-extensions",
          "--disable-plugins",
          "--disable-gpu-sandbox",
          "--enable-unsafe-swiftshader",
          "--ignore-certificate-errors",
          "--allow-running-insecure-content",
        ],
        ...(chromeExecutable && { executablePath: chromeExecutable }),
      };

      this.browser = await chromium.launch(launchOptions);

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

      // Wait a moment for APIs to be available
      await this.page.waitForTimeout(1000);

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
      const result = await this.page.evaluate(() => {
        const hasTranslation = "translation" in window;
        const hasCreateTranslator = hasTranslation && "createTranslator" in (window as any).translation;

        return {
          hasTranslation,
          hasCreateTranslator,
          windowProps: Object.keys(window).filter((key) => key.includes("translat")),
          userAgent: navigator.userAgent,
          availableFeatures: Object.keys(window).filter((key) => key.includes("API") || key.includes("api")),
        };
      });

      console.log("Translator API diagnostic:", result);

      // Try to check if language models are available
      const languageCheck = await this.page.evaluate(() => {
        // Check if we can access the internal translation page
        try {
          return {
            canAccessInternals: true,
            chromeVersion: /Chrome\/(\d+\.\d+\.\d+\.\d+)/.exec(navigator.userAgent)?.[1],
            hasAI: "ai" in window,
            hasTranslator: "Translator" in window,
            globalThis: Object.keys(globalThis).filter((key) => key.toLowerCase().includes("translat")),
          };
        } catch (error) {
          return {
            canAccessInternals: false,
            error: error instanceof Error ? error.message : String(error),
            chromeVersion: /Chrome\/(\d+\.\d+\.\d+\.\d+)/.exec(navigator.userAgent)?.[1],
          };
        }
      });

      console.log("Language support check:", languageCheck);

      return result.hasTranslation && result.hasCreateTranslator;
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
