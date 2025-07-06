import { chromium } from "playwright";
import type { BrowserContext, Page } from "playwright";

/**
 * Initialize Chrome browser with Translator API support
 */
export async function initializeBrowser(): Promise<{ context: BrowserContext; page: Page }> {
  const context = await chromium.launchPersistentContext("/tmp/chrome-translator-profile", {
    headless: false,
    channel: "chrome",
    viewport: { width: 1280, height: 720 },
    args: [
      "--enable-experimental-web-platform-features",
      "--enable-features=TranslationAPI",
      "--enable-blink-features=TranslationAPI",
      "--disable-web-security",
      "--no-sandbox",
    ],
  });

  const page = await context.newPage();
  await page.goto("https://www.google.com");
  await page.waitForTimeout(2000);

  // Verify API is available
  const hasAPI = await page.evaluate(() => {
    return "Translator" in window && typeof (window as any).Translator?.create === "function";
  });

  if (!hasAPI) {
    throw new Error("Translator API not available");
  }

  return { context, page };
}
