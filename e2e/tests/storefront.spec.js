const { test, expect } = require('./fixtures');
const { login } = require('./helpers');

const categoryPath = '/catalog/urny_dlya_prakha_/';
const productName = 'Учебная урна';

async function addDemo(page) {
  await page.goto(categoryPath);
  await page.getByRole('link', { name: productName }).last().click();
  await expect(page.getByRole('heading', { name: productName })).toBeVisible();
  await page.getByRole('button', { name: 'В корзину', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Товар добавлен');
  await page.getByRole('link', { name: /Корзина, товаров:/ }).click();
  await expect(page.getByText(productName).first()).toBeVisible();
}

async function checkout(page, delivery, payment) {
  await addDemo(page);
  await page.getByRole('link', { name: /Перейти к оформлению/i }).click();
  await page.getByLabel('Имя', { exact: true }).fill('Тестовый покупатель');
  await page.getByLabel('Email', { exact: true }).fill(`e2e-${Date.now()}@example.test`);
  await page.getByLabel('Телефон', { exact: true }).fill('+79990001122');
  await page.getByLabel('Город', { exact: true }).fill('Москва');
  await page.getByRole('radio', { name: new RegExp(`^${delivery}(?: |$)`, 'i') }).check();
  if (delivery === 'Курьер') await page.getByLabel('Адрес', { exact: true }).fill('Тестовая улица, 1');
  await page.getByLabel(payment, { exact: false }).check();
  const consent = page.getByRole('checkbox', { name: /соглас/i });
  await page.getByRole('button', { name: 'Подтвердить заказ' }).click();
  await expect(consent).not.toBeChecked();
  expect(await consent.evaluate(el => el.validity.valueMissing)).toBe(true);
  await consent.check();
  let resolveOrder;
  const orderPromise = new Promise(resolve => { resolveOrder = resolve; });
  await page.route('**/api/orders', async route => {
    const response = await route.fetch();
    const order = await response.json();
    resolveOrder({ status: response.status(), order });
    await route.fulfill({ response });
  }, { times: 1 });
  await page.getByRole('button', { name: 'Подтвердить заказ' }).click();
  const result = await orderPromise;
  expect(result.status).toBe(201);
  return result.order;
}

test('категория, карточка, изменение количества и удаление товара', async ({ page }) => {
  await addDemo(page);
  const row = page.locator('.cart-row').filter({ hasText: productName });
  const initial = await row.locator('.cart-actions strong').innerText();
  await page.getByRole('button', { name: `Увеличить количество ${productName}` }).click();
  await expect(row.locator('.quantity-control span')).toHaveText('2');
  await expect(row.locator('.cart-actions strong')).not.toHaveText(initial);
  const amount = text => Number(text.replace(/[^0-9,]/g, '').replace(',', '.'));
  expect(amount(await row.locator('.cart-actions strong').innerText())).toBe(amount(initial) * 2);
  expect(amount(await page.locator('.cart-summary strong').innerText())).toBe(amount(initial) * 2);
  await page.getByRole('button', { name: `Уменьшить количество ${productName}` }).click();
  await expect(row.locator('.quantity-control span')).toHaveText('1');
  await expect(row.locator('.cart-actions strong')).toHaveText(initial);
  await page.getByRole('button', { name: /Удалить/i }).first().click();
  await expect(page.getByText(productName)).toHaveCount(0);
});

for (const delivery of ['Самовывоз', 'Курьер']) {
  test(`гостевой заказ: ${delivery}, наличные и согласие`, async ({ page }) => {
    await checkout(page, delivery, 'Наличные курьеру');
    await expect(page.getByText('Заказ принят')).toBeVisible();
  });
}

test('тестовая онлайн-оплата видна менеджеру', async ({ page }) => {
  const order = await checkout(page, 'Самовывоз', 'Тестовая оплата');
  await page.getByRole('button', { name: 'Оплатить тестовый заказ' }).click();
  await expect(page.getByText('Оплата прошла успешно')).toBeVisible();
  const number = order.number;
  expect(number).toBeTruthy();
  await login(page);
  await page.getByRole('menuitem', { name: 'Платежи' }).click();
  const row = page.getByRole('row').filter({ hasText: number });
  await expect(row).toContainText('Оплачен');
});

test('мобильные меню и полноэкранный фильтр', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть меню каталога' }).click();
  await page.getByRole('navigation', { name: 'Навигация сайта' }).getByRole('link', { name: 'Каталог', exact: true }).click();
  await expect(page).toHaveURL(/\/catalog\/?$/);
  await page.getByRole('link', { name: 'Урны для праха' }).first().click();
  await expect(page).toHaveURL(new RegExp(categoryPath.replace(/\/$/, '') + '/?$'));
  await page.getByRole('button', { name: 'Фильтры' }).click();
  const panel = page.getByRole('dialog', { name: 'Фильтры каталога' });
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds.width).toBeGreaterThanOrEqual(390);
  expect(bounds.height).toBeGreaterThanOrEqual(844);
  await panel.getByRole('button', { name: 'Закрыть фильтры' }).click();
  await expect(panel).toBeHidden();
});

test('мобильный фильтр меняет выдачу и сброс восстанавливает товар', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(categoryPath);
  const results = page.getByRole('region', { name: 'Товары' });
  await expect(results.getByRole('link', { name: productName }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Фильтры' }).click();
  const panel = page.getByRole('dialog', { name: 'Фильтры каталога' });
  await panel.getByLabel('Цена до').fill('1');
  await panel.getByRole('button', { name: /Показать/ }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('maxPrice')).toBe('100');
  await expect(results.getByRole('link', { name: productName })).toHaveCount(0);
  await expect(results.locator('.empty-state')).toBeVisible();
  await expect(results.locator('.empty-state')).toContainText('Товары пока не добавлены');
  await expect(results.getByTestId('product-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Фильтры' }).click();
  await panel.getByRole('button', { name: 'Сбросить' }).click();
  await expect(page).not.toHaveURL(/maxPrice=/);
  await expect(results.getByRole('link', { name: productName }).last()).toBeVisible();
});
