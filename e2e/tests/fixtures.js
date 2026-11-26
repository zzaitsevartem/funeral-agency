const base = require('@playwright/test');
const test = base.test.extend({
  page: async ({ page }, use) => {
    const remote = [];
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if ((url.protocol === 'http:' || url.protocol === 'https:') && !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) {
        remote.push(url.origin);
        return route.abort();
      }
      return route.continue();
    });
    await use(page);
    base.expect([...new Set(remote)], 'Страница пыталась обратиться к внешним источникам').toEqual([]);
  },
});
module.exports = { test, expect: base.expect };
