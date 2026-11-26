const { test, expect } = require('./fixtures');

const { login } = require('./helpers');
const { removeCatalogFixture } = require('./catalog-fixture');

test('администратор входит и вручную создаёт категорию и товар', async ({ page }, testInfo) => {
  const target = new URL(testInfo.project.use.baseURL);
  if (target.port !== '8081') throw new Error('Catalog fixture requires favorit-e2e on port 8081');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}`;
  try {
    await createAndCheckCatalogFixture(page, id);
  } finally {
    removeCatalogFixture(id);
  }
});

async function createAndCheckCatalogFixture(page, id) {
  const category = `E2E категория ${id}`;
  const product = `E2E товар ${id}`;
  await login(page);
  await page.getByRole('menuitem', { name: 'Категории' }).click();
  await page.getByRole('link', { name: /Добавить/i }).click();
  await page.getByLabel('Название категории').fill(category);
  await page.getByLabel('Короткий адрес').fill(`e2e-${id}`);
  await page.getByRole('button', { name: /Сохранить/i }).click();
  await expect(page.getByRole('heading', { name: 'Редактировать категорию' })).toBeVisible();
  await expect(page.getByLabel('Название категории')).toHaveValue(category);
  await page.getByRole('menuitem', { name: 'Товары' }).click();
  await page.getByRole('link', { name: /Добавить/i }).click();
  await page.getByLabel('Название товара').fill(product);
  await page.getByLabel('Артикул').fill(`E2E-${id}`);
  await page.getByLabel('Цена, ₽').fill('1234');
  await page.getByLabel('Адрес страницы').fill(`e2e-product-${id}`);
  const categoryInput = page.getByRole('combobox', { name: 'Категория' });
  await categoryInput.fill(category);
  await page.getByRole('option', { name: category }).click();
  await page.getByRole('switch', { name: 'Опубликован' }).check();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=', 'base64');
  await page.locator('input[type="file"]').setInputFiles({ name: 'e2e.png', mimeType: 'image/png', buffer: png });
  const upload = page.waitForResponse(r => r.url().endsWith('/api/admin/uploads') && r.request().method() === 'PUT');
  await page.getByRole('button', { name: /Сохранить/i }).click();
  const uploadResponse = await upload;
  expect(uploadResponse.status()).toBe(201);
  const { url } = await uploadResponse.json();
  expect(url).toMatch(/^\/uploads\//);
  await expect(page.getByLabel('Название товара')).toHaveValue(product);
  await expect(page.getByLabel('Галерея товара').locator('img')).toHaveAttribute('src', url);
  await page.reload();
  await expect(page.getByLabel('Галерея товара').locator('img')).toHaveAttribute('src', url);
  await page.goto(`/catalog/e2e-${id}/e2e-product-${id}/`);
  await expect(page.getByRole('heading', { name: product })).toBeVisible();
  const image = page.locator(`img[src="${url}"]`);
  await expect(image.first()).toBeVisible();
  await expect.poll(() => image.first().evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  const served = await page.request.get(url);
  expect(served.status()).toBe(200);
  expect(served.headers()['content-type']).toContain('image/png');
  expect(await served.body()).toEqual(png);
}
