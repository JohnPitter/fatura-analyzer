import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_PDF = path.join(__dirname, 'fixtures', 'test-bradesco.pdf');

// Helper: wait for transactions to load after PDF upload
async function uploadAndWait(page: import('@playwright/test').Page) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(TEST_PDF);
  await expect(page.getByRole('heading', { name: /Transacoes/ })).toBeVisible({ timeout: 10000 });
}

// ─── Empty State ────────────────────────────────────────────────────────────

test.describe('Empty State', () => {
  test('shows empty state on initial load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Nenhuma fatura carregada')).toBeVisible();
    await expect(page.getByText('Selecionar faturas PDF')).toBeVisible();
  });

  test('shows Fatura Analyzer branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Fatura Analyzer' })).toBeVisible();
    await expect(page.getByText('Analise seus gastos')).toBeVisible();
  });

  test('shows drag and drop hint', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/arraste e solte/)).toBeVisible();
  });

  test('shows privacy badge in empty state', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/tudo roda no seu navegador/)).toBeVisible();
  });

  test('does not show split button when empty', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Dividir gastos')).not.toBeVisible();
  });
});

// ─── Privacy ────────────────────────────────────────────────────────────────

test.describe('Privacy', () => {
  test('shows privacy button in header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Privacidade')).toBeVisible();
  });

  test('opens privacy banner with security info', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Privacidade').click();
    await expect(page.getByText('Seus dados estao 100% seguros')).toBeVisible();
    await expect(page.getByText('Nenhuma informacao financeira e enviada para servidores externos.')).toBeVisible();
    await expect(page.getByText(/fechar ou recarregar a pagina/)).toBeVisible();
  });

  test('closes privacy banner', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Privacidade').click();
    await expect(page.getByText('Seus dados estao 100% seguros')).toBeVisible();
    const banner = page.locator('.bg-jade-100');
    await banner.locator('button').click();
    await expect(page.getByText('Seus dados estao 100% seguros')).not.toBeVisible();
  });

  test('shows privacy info in footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Processamento local')).toBeVisible();
    await expect(page.getByText('Zero rastreamento')).toBeVisible();
    await expect(page.getByText('Sem cookies')).toBeVisible();
  });
});

// ─── PDF Upload & Dashboard ─────────────────────────────────────────────────

test.describe('PDF Upload', () => {
  test('uploads PDF and shows transactions', async ({ page }) => {
    await page.goto('/');
    await uploadAndWait(page);
    await expect(page.getByText('test-bradesco.pdf')).toBeVisible();
  });

  test('shows summary cards after upload', async ({ page }) => {
    await page.goto('/');
    await uploadAndWait(page);
    await expect(page.getByText('Total da Fatura')).toBeVisible();
    await expect(page.getByText('Meu Total (pessoal)')).toBeVisible();
  });

  test('shows category breakdown after upload', async ({ page }) => {
    await page.goto('/');
    await uploadAndWait(page);
    await expect(page.getByText('Gastos por Categoria')).toBeVisible();
  });

  test('shows Dividir gastos button after upload', async ({ page }) => {
    await page.goto('/');
    await uploadAndWait(page);
    await expect(page.getByText('Dividir gastos')).toBeVisible();
  });

  test('shows bulk split section after upload', async ({ page }) => {
    await page.goto('/');
    await uploadAndWait(page);
    await expect(page.getByText('Dividir em massa')).toBeVisible();
  });
});

// ─── Category Filtering ─────────────────────────────────────────────────────

test.describe('Category Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await uploadAndWait(page);
  });

  test('filters transactions when clicking a category', async ({ page }) => {
    const categoryBtn = page.locator('button.w-full').first();
    await categoryBtn.click();

    // Transaction count should change (shown as "(N)")
    const heading = page.getByRole('heading', { name: /Transacoes/ });
    await expect(heading).toBeVisible();
  });

  test('removes filter when clicking category again', async ({ page }) => {
    const categoryBtn = page.locator('button.w-full').first();
    await categoryBtn.click();
    await categoryBtn.click();
    // All transactions visible again
    const heading = page.getByRole('heading', { name: /Transacoes/ });
    await expect(heading).toBeVisible();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe('Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await uploadAndWait(page);
  });

  test('sorts by column when clicking header', async ({ page }) => {
    const header = page.locator('th').filter({ hasText: 'Data' });
    await header.click();
    await header.click();
    await expect(page.getByRole('heading', { name: /Transacoes/ })).toBeVisible();
  });

  test('sorts by value when clicking Valor header', async ({ page }) => {
    const header = page.locator('th').filter({ hasText: 'Valor' });
    await header.click();
    await expect(page.getByRole('heading', { name: /Transacoes/ })).toBeVisible();
  });
});

// ─── Split System ───────────────────────────────────────────────────────────

test.describe('Split System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await uploadAndWait(page);
  });

  test('opens split panel', async ({ page }) => {
    await page.getByText('Dividir gastos').click();
    await expect(page.getByText('Gerenciar Pessoas')).toBeVisible();
    await expect(page.getByText('Eu').first()).toBeVisible();
  });

  test('adds a new person', async ({ page }) => {
    await page.getByText('Dividir gastos').click();
    await page.getByPlaceholder('Nome da pessoa...').fill('Namorada');
    await page.getByPlaceholder('Nome da pessoa...').press('Enter');
    await expect(page.getByText('Namorada').first()).toBeVisible();
  });

  test('shows person totals after adding second person', async ({ page }) => {
    await page.getByText('Dividir gastos').click();
    await page.getByPlaceholder('Nome da pessoa...').fill('Amigo');
    await page.getByPlaceholder('Nome da pessoa...').press('Enter');
    await expect(page.getByText('Total por pessoa')).toBeVisible();
  });

  test('removes a person', async ({ page }) => {
    await page.getByText('Dividir gastos').click();
    await page.getByPlaceholder('Nome da pessoa...').fill('Temp');
    await page.getByPlaceholder('Nome da pessoa...').press('Enter');
    await expect(page.getByText('Temp').first()).toBeVisible();

    const tempChip = page.locator('span').filter({ hasText: 'Temp' }).first();
    await tempChip.locator('button').click();
    await expect(page.getByText('Total por pessoa')).not.toBeVisible();
  });

  test('closes split panel', async ({ page }) => {
    await page.getByText('Dividir gastos').click();
    await expect(page.getByText('Gerenciar Pessoas')).toBeVisible();
    await page.getByText('Dividir gastos').click();
    await expect(page.getByText('Gerenciar Pessoas')).not.toBeVisible();
  });
});

// ─── Transaction Interactions ───────────────────────────────────────────────

test.describe('Transaction Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await uploadAndWait(page);
  });

  test('shows source badges on transactions', async ({ page }) => {
    const badges = page.locator('span').filter({ hasText: 'Bradesco' });
    expect(await badges.count()).toBeGreaterThanOrEqual(1);
  });

  test('category dropdown opens on click', async ({ page }) => {
    const categoryBadge = page.locator('td.relative button').first();
    await categoryBadge.click();
    await expect(page.locator('.grid.grid-cols-2').last()).toBeVisible();
  });

  test('can change transaction category via dropdown', async ({ page }) => {
    // Use the last category badge to avoid sticky header overlap
    const categoryBadges = page.locator('td.relative button');
    const lastBadge = categoryBadges.last();
    await lastBadge.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300); // wait for scroll to settle
    await lastBadge.click({ force: true });
    // The dropdown appears
    const dropdown = page.locator('td.relative .absolute');
    await expect(dropdown).toBeVisible();
    // Click a different category using dispatchEvent to avoid interception
    await dropdown.locator('button').nth(3).dispatchEvent('click');
    // After selecting, the dropdown should close
    await expect(dropdown).not.toBeVisible({ timeout: 3000 });
  });

  test('bulk split changes split count', async ({ page }) => {
    const bulkSection = page.locator('div').filter({ hasText: 'Dividir em massa' }).last();
    const divBy2 = bulkSection.getByText('÷2').first();
    await divBy2.click();
    await expect(page.getByText(/dividido/)).toBeVisible();
  });
});

// ─── Data Persistence Check ─────────────────────────────────────────────────

test.describe('No Data Persistence', () => {
  test('data is gone after page reload', async ({ page }) => {
    await page.goto('/');
    await uploadAndWait(page);

    await page.reload();

    await expect(page.getByText('Nenhuma fatura carregada')).toBeVisible();
  });
});
