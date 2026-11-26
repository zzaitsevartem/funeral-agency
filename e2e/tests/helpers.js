const { expect } = require('./fixtures');

async function login(page) {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  if (!/^a-[a-f0-9]{24,64}$/.test(process.env.ADMIN_ENTRY_SLUG || '')) throw new Error('Valid ADMIN_ENTRY_SLUG required');
  await page.goto('/' + process.env.ADMIN_ENTRY_SLUG);
  await expect(page.getByRole('heading', { name: 'Вход администратора' })).toBeVisible();
  await page.getByLabel('Email').fill(process.env.ADMIN_EMAIL);
  await page.getByLabel('Пароль').fill(process.env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('menuitem', { name: 'Категории' })).toBeVisible();
}

module.exports = { login };
