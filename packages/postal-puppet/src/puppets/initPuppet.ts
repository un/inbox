import type { PuppetInstance } from '../index';
import puppeteer from 'puppeteer';

export async function initPuppet(options: {
  postalControlPanel: string;
  postalUrl: string;
  postalUser: string;
  postalPass: string;
}): Promise<{
  puppetInstance: PuppetInstance | null;
  error: Error | null;
}> {
  try {
    const url = `https://${options.postalControlPanel}.${options.postalUrl}`;
    const browser = await puppeteer.launch({
      headless: process.env.NODE_ENV === 'production' ? true : false
    });
    const page = await browser.newPage();
    await page.goto(`${url}/login`);
    await page.locator(`[name="email_address"]`).fill(options.postalUser);
    await page.locator('[name="password"]').fill(options.postalPass);
    await page.click('[name="commit"]');
    await page.waitForNetworkIdle();
    return {
      puppetInstance: { browser, page, url } as PuppetInstance,
      error: null
    };
  } catch (error: any) {
    console.log('Postal: initPuppet Error:', error);
    return {
      puppetInstance: null,
      error
    };
  }
}
