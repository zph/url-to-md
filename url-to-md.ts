#!/usr/bin/env -S deno run -A

import { parseArgs } from "@std/cli/parse-args";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { JSDOM } from "jsdom";
import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";
import { chromium } from "playwright";

interface Options {
  url: string;
  output?: string;
  help?: boolean;
}

const HELP_TEXT = `
url-to-md - Convert any webpage to clean Markdown

Usage:
  url-to-md <url> [options]

Options:
  -o, --output <file>          Output file (default: stdout)
  -h, --help                   Show this help

Examples:
  url-to-md https://example.com
  url-to-md https://example.com -o article.md
`;

async function ensureBrowserInstalled(): Promise<void> {
  try {
    const executablePath = chromium.executablePath();
    if (executablePath) {
      // Check if the executable file actually exists
      try {
        await Deno.stat(executablePath);
        return; // Browser is already installed
      } catch {
        // File doesn't exist, need to install
      }
    }
  } catch {
    // executablePath() might throw if browser isn't installed
  }

  // Browser not found, install it
  console.error("Playwright browser not found. Installing Chromium...");
  const installCmd = new Deno.Command("npx", {
    args: ["-y", "playwright@^1.48.0", "install", "chromium"],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { success } = await installCmd.output();
  if (!success) {
    throw new Error("Failed to install Playwright browser. Please run: npx playwright install chromium");
  }
  console.error("✓ Browser installed successfully");
}

async function convertUrlToMarkdown(options: Options): Promise<string> {
  const { url } = options;

  // Ensure browser is installed before launching
  await ensureBrowserInstalled();

  // Launch browser and fetch webpage
  console.error(`Launching browser...`);
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    });

    const page = await context.newPage();

    // Hide webdriver property
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    console.error(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Wait a bit for dynamic content and to appear more human-like
    await page.waitForTimeout(2000);

    // Scroll down a bit to trigger lazy loading
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight / 2);
    });
    await page.waitForTimeout(1000);

    // Get the rendered HTML
    const html = await page.content();

    // Parse with JSDOM
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Extract main content with Readability
    console.error("Extracting main content...");
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Failed to extract article content");
    }

    // Convert to Markdown
    console.error("Converting to Markdown...");
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });

    let markdown = turndownService.turndown(article.content);

    // Add title and metadata
    const metadata = `# ${article.title}\n\n`;
    const byline = article.byline ? `*By ${article.byline}*\n\n` : "";
    const excerpt = article.excerpt ? `> ${article.excerpt}\n\n` : "";
    const sourceUrl = `**Source:** ${url}\n\n---\n\n`;

    markdown = metadata + byline + excerpt + sourceUrl + markdown;

    return markdown;
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["output"],
    boolean: ["help"],
    alias: {
      o: "output",
      h: "help",
    },
  });

  if (args.help || args._.length === 0) {
    console.log(HELP_TEXT);
    Deno.exit(args.help ? 0 : 1);
  }

  const url = args._[0] as string;

  try {
    const options: Options = {
      url,
      output: args.output,
    };

    const markdown = await convertUrlToMarkdown(options);

    if (options.output) {
      const outputDir = dirname(options.output);
      if (outputDir !== ".") {
        await ensureDir(outputDir);
      }
      await Deno.writeTextFile(options.output, markdown);
      console.error(`✓ Markdown saved to ${options.output}`);
    } else {
      console.log(markdown);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
