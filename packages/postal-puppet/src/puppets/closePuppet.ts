import type { PuppetInstance } from '../index';

export async function closePuppet(puppetInstance: PuppetInstance) {
  await puppetInstance.browser.close();
}
