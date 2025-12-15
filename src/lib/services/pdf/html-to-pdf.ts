import puppeteer from 'puppeteer';

type RenderHtmlToPdfOptions = {
  html: string;
  /**
   * Defaults to A4.
   */
  format?: 'A4' | 'Letter';
  /**
   * Defaults to true.
   */
  printBackground?: boolean;
  /**
   * Default margins tuned for business documents.
   */
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
};

let browserPromise: Promise<puppeteer.Browser> | null = null;

async function getBrowser(): Promise<puppeteer.Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    });
  }
  return await browserPromise;
}

export async function renderHtmlToPdfBuffer(options: RenderHtmlToPdfOptions): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Most templates are self-contained (no external network); still wait for DOM stability.
    await page.setContent(options.html, { waitUntil: 'networkidle0' });

    // Ensure print media rules apply.
    await page.emulateMediaType('print');

    const pdf = await page.pdf({
      format: options.format ?? 'A4',
      printBackground: options.printBackground ?? true,
      preferCSSPageSize: true,
      margin: options.margin ?? {
        top: '18mm',
        right: '14mm',
        bottom: '18mm',
        left: '14mm',
      },
    });

    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}


