import { execSync } from "child_process";
import { promises as fs } from "fs";

/**
 * Chrome environment setup and validation script
 */
class ChromeSetup {
  /**
   * Check if Chrome is installed and get version
   */
  async checkChromeInstallation(): Promise<{ installed: boolean; version?: string; path?: string }> {
    const chromePaths = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/opt/google/chrome/google-chrome",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Windows
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe", // Windows 32-bit
    ];

    for (const path of chromePaths) {
      try {
        // Check if file exists
        await fs.access(path);

        // Try to get version
        try {
          const versionOutput = execSync(`"${path}" --version`, { encoding: "utf-8", timeout: 5000 });
          const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+\.\d+)/);
          const version = versionMatch ? versionMatch[1] : "unknown";

          return { installed: true, version, path };
        } catch (error) {
          return { installed: true, path };
        }
      } catch (error) {
        // File doesn't exist, try next path
      }
    }

    // Try using which/where command
    try {
      const whichCommand = process.platform === "win32" ? "where" : "which";
      const chromePath = execSync(
        `${whichCommand} google-chrome 2>/dev/null || ${whichCommand} chrome 2>/dev/null || ${whichCommand} chromium 2>/dev/null`,
        { encoding: "utf-8", timeout: 5000 },
      ).trim();

      if (chromePath) {
        try {
          const versionOutput = execSync(`"${chromePath}" --version`, { encoding: "utf-8", timeout: 5000 });
          const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+\.\d+)/);
          const version = versionMatch ? versionMatch[1] : "unknown";

          return { installed: true, version, path: chromePath };
        } catch (error) {
          return { installed: true, path: chromePath };
        }
      }
    } catch (error) {
      // Command failed
    }

    return { installed: false };
  }

  /**
   * Check if Chrome version supports Translator API
   */
  checkTranslatorAPISupport(version: string): boolean {
    try {
      const majorVersion = parseInt(version.split(".")[0]);
      return majorVersion >= 138;
    } catch (error) {
      console.warn("Could not parse Chrome version:", version);
      return false;
    }
  }

  /**
   * Check if Playwright Chromium is available
   */
  async checkPlaywrightChromium(): Promise<{ available: boolean; version?: string; path?: string }> {
    try {
      // Check if Playwright is installed
      const playwrightPath = execSync("npm list playwright --depth=0", { encoding: "utf-8", timeout: 5000 });
      if (!playwrightPath.includes("playwright@")) {
        return { available: false };
      }

      // Check Playwright Chromium installation
      const { chromium } = await import("playwright");

      try {
        const browser = await chromium.launch({ headless: true });
        const version = browser.version();
        await browser.close();

        return { available: true, version };
      } catch (error) {
        console.warn("Playwright Chromium launch failed:", error);
        return { available: false };
      }
    } catch (error) {
      return { available: false };
    }
  }

  /**
   * Test Chrome Translator API availability
   */
  async testTranslatorAPI(): Promise<{ available: boolean; error?: string }> {
    try {
      const { chromium } = await import("playwright");

      const launchOptions = {
        headless: false, // Need to be visible for Translator API
        channel: "chrome", // Use Playwright-managed Chrome
        args: ["--enable-experimental-web-platform-features", "--enable-features=TranslationAPI", "--disable-web-security", "--no-sandbox"],
      };

      const browser = await chromium.launch(launchOptions);

      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to a blank page
      await page.goto("about:blank");

      // Test Translator API availability
      const isAvailable = await page.evaluate(() => {
        return "Translator" in window && typeof (window as any).Translator?.create === "function";
      });

      await browser.close();

      if (isAvailable) {
        return { available: true };
      } else {
        return { available: false, error: "Translator API not found - window.Translator.create() is not available" };
      }
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : "Unknown error during API test",
      };
    }
  }

  /**
   * Run comprehensive environment check
   */
  async runEnvironmentCheck(): Promise<void> {
    console.log("🔍 Checking Chrome environment for ISO 24765 Translator...\n");

    // Check Node.js version
    console.log("📋 Node.js Version Check:");
    const nodeVersion = process.version;
    const majorNodeVersion = parseInt(nodeVersion.substring(1).split(".")[0]);

    if (majorNodeVersion >= 24) {
      console.log(`✅ Node.js ${nodeVersion} (requirement: >= 24.0.0)`);
    } else {
      console.log(`❌ Node.js ${nodeVersion} (requirement: >= 24.0.0)`);
      console.log("   Please upgrade to Node.js 24 or later");
    }

    // Check Chrome installation
    console.log("\n🌐 Chrome Installation Check:");
    const chromeCheck = await this.checkChromeInstallation();

    if (chromeCheck.installed) {
      console.log(`✅ Chrome installed at: ${chromeCheck.path}`);
      if (chromeCheck.version) {
        console.log(`   Version: ${chromeCheck.version}`);

        if (this.checkTranslatorAPISupport(chromeCheck.version)) {
          console.log("✅ Chrome version supports Translator API (>= 138)");
        } else {
          console.log("❌ Chrome version does not support Translator API (requires >= 138)");
          console.log("   Please update Chrome to version 138 or later");
        }
      } else {
        console.log("⚠️  Could not determine Chrome version");
      }
    } else {
      console.log("❌ Chrome not found");
      console.log("   Please install Google Chrome 138 or later");
      console.log("   Download from: https://www.google.com/chrome/");
    }

    // Check Playwright Chrome
    console.log("\n🎭 Playwright Chrome Check:");
    const playwrightCheck = await this.checkPlaywrightChromium();

    if (playwrightCheck.available) {
      console.log("✅ Playwright Chrome available");
      if (playwrightCheck.version) {
        console.log(`   Version: ${playwrightCheck.version}`);
      }
    } else {
      console.log("❌ Playwright Chrome not available");
      console.log("   Run: npm install && npx playwright install chrome");
    }

    // Test Translator API
    console.log("\n🔧 Translator API Test:");
    console.log("   Testing Chrome Translator API availability...");

    const apiTest = await this.testTranslatorAPI();

    if (apiTest.available) {
      console.log("✅ Chrome Translator API is working");
    } else {
      console.log("❌ Chrome Translator API test failed");
      console.log(`   Error: ${apiTest.error}`);
      console.log("   This may be due to:");
      console.log("   - Chrome version < 138");
      console.log("   - Experimental features disabled");
      console.log("   - Headless mode limitations");
    }

    // Check input file
    console.log("\n📁 Input File Check:");
    const inputPath = "input/iso24765-terminology.json";

    try {
      await fs.access(inputPath);
      const stats = await fs.stat(inputPath);
      console.log(`✅ Input file found: ${inputPath}`);
      console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Validate JSON structure
      const content = await fs.readFile(inputPath, "utf-8");
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        console.log(`   Terms count: ${data.length}`);
      } else {
        console.log("⚠️  Input file is not an array of terms");
      }
    } catch (error) {
      console.log(`❌ Input file not found: ${inputPath}`);
      console.log("   Please ensure the terminology file exists");
    }

    // Check output directory
    console.log("\n📂 Output Directory Check:");
    const outputDir = "output";

    try {
      await fs.access(outputDir);
      console.log(`✅ Output directory exists: ${outputDir}`);
    } catch (error) {
      console.log(`⚠️  Output directory not found: ${outputDir}`);
      console.log("   Creating output directory...");

      try {
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`✅ Output directory created: ${outputDir}`);
      } catch (createError) {
        console.log(`❌ Failed to create output directory: ${createError}`);
      }
    }

    // Summary
    console.log("\n📊 Environment Check Summary:");

    const allChecks = [
      { name: "Node.js version", passed: majorNodeVersion >= 24 },
      { name: "Chrome installation", passed: chromeCheck.installed },
      { name: "Chrome version", passed: chromeCheck.version ? this.checkTranslatorAPISupport(chromeCheck.version) : false },
      { name: "Playwright Chrome", passed: playwrightCheck.available },
      { name: "Translator API", passed: apiTest.available },
    ];

    const passedChecks = allChecks.filter((check) => check.passed).length;
    const totalChecks = allChecks.length;

    console.log(`   Passed: ${passedChecks}/${totalChecks} checks`);

    if (passedChecks === totalChecks) {
      console.log("🎉 Environment is ready for translation!");
      console.log("\nNext steps:");
      console.log("   npm start translate");
    } else {
      console.log("⚠️  Some checks failed. Please address the issues above.");

      if (!chromeCheck.installed || !this.checkTranslatorAPISupport(chromeCheck.version || "0")) {
        console.log("\n🔗 Chrome Download:");
        console.log("   https://www.google.com/chrome/");
      }

      if (!playwrightCheck.available) {
        console.log("\n🔗 Playwright Setup:");
        console.log("   npm install && npx playwright install chrome");
      }
    }
  }

  /**
   * Install missing dependencies
   */
  async installDependencies(): Promise<void> {
    console.log("📦 Installing dependencies...\n");

    try {
      console.log("Installing npm packages...");
      execSync("npm install", { stdio: "inherit" });
      console.log("✅ npm packages installed\n");

      console.log("Installing Playwright browsers...");
      execSync("npx playwright install chrome", { stdio: "inherit" });
      console.log("✅ Playwright Chrome installed\n");

      console.log("🎉 All dependencies installed successfully!");
    } catch (error) {
      console.error("❌ Failed to install dependencies:", error);
      throw error;
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "check";

  const setup = new ChromeSetup();

  try {
    switch (command) {
      case "check":
        await setup.runEnvironmentCheck();
        break;

      case "install":
        await setup.installDependencies();
        break;

      case "test-api":
        console.log("🔧 Testing Chrome Translator API...");
        const result = await setup.testTranslatorAPI();
        if (result.available) {
          console.log("✅ Chrome Translator API is working!");
        } else {
          console.log("❌ Chrome Translator API test failed:");
          console.log(`   ${result.error}`);
        }
        break;

      default:
        console.log(`
Chrome Environment Setup

Usage:
  node scripts/setup-chrome.ts [command]

Commands:
  check      Run comprehensive environment check (default)
  install    Install missing dependencies (npm + playwright)
  test-api   Test Chrome Translator API availability

Examples:
  node scripts/setup-chrome.ts
  node scripts/setup-chrome.ts check
  node scripts/setup-chrome.ts install
  node scripts/setup-chrome.ts test-api
        `);
    }
  } catch (error) {
    console.error("Setup failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
