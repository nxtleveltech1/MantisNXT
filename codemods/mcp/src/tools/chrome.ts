import { z } from 'zod';
import puppeteer from 'puppeteer';
import { MCPTool } from '../types';

/**
 * Launch a headless browser, navigate to a URL, and return the page title.
 */
const chromeGetTitle: MCPTool = {
  description: 'Open a page in headless Chrome and return its title',
  schema: z.object({
    url: z.string().url(),
  }),
  handler: async ({ url }) => {
    const launchOptions: any = { headless: 'new' };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const browser = await puppeteer.launch(launchOptions);
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const title = await page.title();
      return { url, title };
    } finally {
      await browser.close();
    }
  },
};

/**
 * Take a screenshot of a URL and save it to a PNG file.
 */
const chromeScreenshot: MCPTool = {
  description: 'Take a screenshot of a URL and save it to disk',
  schema: z.object({
    url: z.string().url(),
    path: z.string().min(1),
  }),
  handler: async ({ url, path }) => {
    const launchOptions: any = { headless: 'new' };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const browser = await puppeteer.launch(launchOptions);
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.screenshot({ path, fullPage: true });
      return { url, path };
    } finally {
      await browser.close();
    }
  },
};

export default {
  chromeGetTitle,
  chromeScreenshot,
};
