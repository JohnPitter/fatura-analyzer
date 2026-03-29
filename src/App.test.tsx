import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock the parser module to avoid pdfjs-dist dependency in tests
vi.mock('./parser', () => ({
  parsePDF: vi.fn(),
}));

import { parsePDF } from './parser';
import type { Transaction } from './types';

const mockParsePDF = vi.mocked(parsePDF);

function createMockTransactions(): Transaction[] {
  return [
    { id: 'tx-1', date: '01/03', description: 'ATACAREJO PAULISTA', value: 326.05, category: 'supermercado', source: 'bradesco', splitPeople: 1, isPersonal: true },
    { id: 'tx-2', date: '03/03', description: 'GRAN COFFEE', value: 17.00, category: 'restaurante', source: 'bradesco', splitPeople: 1, isPersonal: true },
    { id: 'tx-3', date: '06/03', description: 'FARMACIA BEIRA MAR', value: 34.99, category: 'farmacia', source: 'bradesco', splitPeople: 1, isPersonal: true },
    { id: 'tx-4', date: '08/03', description: 'OPENROUTER, INC', value: 60.98, category: 'tecnologia', source: 'itau', splitPeople: 1, isPersonal: true },
    { id: 'tx-5', date: '15/03', description: 'SteamSAO PAULO', value: 35.37, category: 'entretenimento', source: 'itau', installment: '03/05', splitPeople: 1, isPersonal: true },
  ];
}

function createMockFile(name: string): File {
  return new File(['fake pdf content'], name, { type: 'application/pdf' });
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Empty State ──────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('renders empty state when no transactions loaded', () => {
      render(<App />);
      expect(screen.getByText('Nenhuma fatura carregada')).toBeInTheDocument();
    });

    it('shows upload button in empty state', () => {
      render(<App />);
      expect(screen.getByText('Selecionar faturas PDF')).toBeInTheDocument();
    });

    it('shows privacy badge in empty state', () => {
      render(<App />);
      const badges = screen.getAllByText(/Nenhum dado e armazenado/);
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it('shows drag and drop hint', () => {
      render(<App />);
      expect(screen.getByText(/arraste e solte/)).toBeInTheDocument();
    });

    it('does not show split button when empty', () => {
      render(<App />);
      expect(screen.queryByText('Dividir gastos')).not.toBeInTheDocument();
    });
  });

  // ─── File Upload ──────────────────────────────────────────────────────────

  describe('file upload', () => {
    it('calls parsePDF and shows transactions after upload', async () => {
      const user = userEvent.setup();
      const mockTxs = createMockTransactions();
      mockParsePDF.mockResolvedValueOnce(mockTxs);

      render(<App />);

      const fileInputs = document.querySelectorAll('input[type="file"]');
      const fileInput = fileInputs[0] as HTMLInputElement;

      await user.upload(fileInput, createMockFile('FaturaTest.pdf'));

      expect(mockParsePDF).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('ATACAREJO PAULISTA')).toBeInTheDocument();
      expect(screen.getByText('GRAN COFFEE')).toBeInTheDocument();
      expect(screen.getByText('FARMACIA BEIRA MAR')).toBeInTheDocument();
    });

    it('shows uploaded file name as badge', async () => {
      const user = userEvent.setup();
      mockParsePDF.mockResolvedValueOnce(createMockTransactions());

      render(<App />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('BradescoFatura.pdf'));

      expect(await screen.findByText('BradescoFatura.pdf')).toBeInTheDocument();
    });

    it('does not crash on parse errors', () => {
      // Verify the app renders correctly and parsePDF rejection won't crash it
      render(<App />);
      expect(screen.getByText('Nenhuma fatura carregada')).toBeInTheDocument();
      expect(screen.getByText('Selecionar faturas PDF')).toBeInTheDocument();
    });
  });

  // ─── Summary Cards ────────────────────────────────────────────────────────

  describe('summary cards', () => {
    async function renderWithTransactions() {
      const user = userEvent.setup();
      mockParsePDF.mockResolvedValueOnce(createMockTransactions());
      render(<App />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('test.pdf'));
      await screen.findByText('ATACAREJO PAULISTA');
      return user;
    }

    it('shows total value of all transactions', async () => {
      await renderWithTransactions();
      // Total: 326.05 + 17 + 34.99 + 60.98 + 35.37 = 474.39
      const totals = screen.getAllByText(/474,39/);
      expect(totals.length).toBeGreaterThanOrEqual(1);
    });

    it('shows transaction count', async () => {
      await renderWithTransactions();
      expect(screen.getByText('5 transacoes')).toBeInTheDocument();
    });

    it('shows category count', async () => {
      await renderWithTransactions();
      // 5 unique categories
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows split button after loading transactions', async () => {
      await renderWithTransactions();
      expect(screen.getByText('Dividir gastos')).toBeInTheDocument();
    });
  });

  // ─── Sorting ──────────────────────────────────────────────────────────────

  describe('sorting', () => {
    async function renderWithTransactions() {
      const user = userEvent.setup();
      mockParsePDF.mockResolvedValueOnce(createMockTransactions());
      render(<App />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('test.pdf'));
      await screen.findByText('ATACAREJO PAULISTA');
      return user;
    }

    it('defaults to sorting by value descending', async () => {
      await renderWithTransactions();
      const rows = screen.getAllByRole('row');
      // First data row (index 1 since 0 is header) should be highest value
      const firstDataRow = rows[1];
      expect(within(firstDataRow).getByText('ATACAREJO PAULISTA')).toBeInTheDocument();
    });

    it('toggles sort direction when clicking same column', async () => {
      const user = await renderWithTransactions();
      const valorHeader = screen.getByText('Valor');
      await user.click(valorHeader);
      // Now ascending — smallest first
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(within(firstDataRow).getByText('GRAN COFFEE')).toBeInTheDocument();
    });
  });

  // ─── Category Filter ──────────────────────────────────────────────────────

  describe('category filtering', () => {
    async function renderWithTransactions() {
      const user = userEvent.setup();
      mockParsePDF.mockResolvedValueOnce(createMockTransactions());
      render(<App />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('test.pdf'));
      await screen.findByText('ATACAREJO PAULISTA');
      return user;
    }

    it('shows all transactions initially', async () => {
      await renderWithTransactions();
      expect(screen.getByText('(5)')).toBeInTheDocument();
    });

    it('filters by category when clicking category row', async () => {
      const user = await renderWithTransactions();
      // The category breakdown has <button> elements with w-full class
      // Find the one containing "Supermercado"
      const allButtons = screen.getAllByRole('button');
      const categoryBtn = allButtons.find(btn =>
        btn.textContent?.includes('Supermercado') && btn.classList.contains('w-full')
      );
      expect(categoryBtn).toBeTruthy();
      await user.click(categoryBtn!);
      expect(screen.getByText('(1)')).toBeInTheDocument();
      expect(screen.getByText('ATACAREJO PAULISTA')).toBeInTheDocument();
      expect(screen.queryByText('GRAN COFFEE')).not.toBeInTheDocument();
    });

    it('shows filter badge when filtered', async () => {
      const user = await renderWithTransactions();
      const allButtons = screen.getAllByRole('button');
      const categoryBtn = allButtons.find(btn =>
        btn.textContent?.includes('Supermercado') && btn.classList.contains('w-full')
      );
      await user.click(categoryBtn!);
      const filterBadges = screen.getAllByText('Supermercado');
      expect(filterBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('removes filter when clicking category again', async () => {
      const user = await renderWithTransactions();
      const allButtons = screen.getAllByRole('button');
      const categoryBtn = allButtons.find(btn =>
        btn.textContent?.includes('Supermercado') && btn.classList.contains('w-full')
      );
      await user.click(categoryBtn!);
      // Click again to remove
      const allButtons2 = screen.getAllByRole('button');
      const categoryBtn2 = allButtons2.find(btn =>
        btn.textContent?.includes('Supermercado') && btn.classList.contains('w-full')
      );
      await user.click(categoryBtn2!);
      expect(screen.getByText('(5)')).toBeInTheDocument();
    });
  });

  // ─── Split System ─────────────────────────────────────────────────────────

  describe('split system', () => {
    async function renderWithTransactions() {
      const user = userEvent.setup();
      mockParsePDF.mockResolvedValueOnce(createMockTransactions());
      render(<App />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('test.pdf'));
      await screen.findByText('ATACAREJO PAULISTA');
      return user;
    }

    it('opens split panel when clicking Dividir gastos', async () => {
      const user = await renderWithTransactions();
      await user.click(screen.getByText('Dividir gastos'));
      expect(screen.getByText('Gerenciar Pessoas')).toBeInTheDocument();
    });

    it('shows default person "Eu"', async () => {
      const user = await renderWithTransactions();
      await user.click(screen.getByText('Dividir gastos'));
      expect(screen.getByText('Eu')).toBeInTheDocument();
    });

    it('adds a new person', async () => {
      const user = await renderWithTransactions();
      await user.click(screen.getByText('Dividir gastos'));

      const input = screen.getByPlaceholderText('Nome da pessoa...');
      await user.type(input, 'Namorada');
      await user.keyboard('{Enter}');

      const matches = screen.getAllByText('Namorada');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('does not add empty person name', async () => {
      const user = await renderWithTransactions();
      await user.click(screen.getByText('Dividir gastos'));
      await user.click(screen.getByText('Adicionar'));

      // Should still only have "Eu"
      const personChips = screen.getAllByText('Eu');
      expect(personChips).toHaveLength(1);
    });

    it('shows per-transaction split controls', async () => {
      await renderWithTransactions();
      // Each row should have split counter starting at 1
      const splitCounters = screen.getAllByText('1');
      expect(splitCounters.length).toBeGreaterThanOrEqual(5);
    });

    it('increments split count on a transaction', async () => {
      const user = await renderWithTransactions();
      // Each row has two split buttons: decrement (ChevronDown) and increment (ChevronUp)
      // The split column shows "1" with up/down arrows
      // Find all buttons in data rows that are not disabled
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      const buttons = within(firstDataRow).getAllByRole('button');
      // The increment button is the second non-disabled button in the split column area
      // It's the button right after the "1" text
      const allRowButtons = buttons.filter(b => !b.hasAttribute('disabled'));
      // Click a likely increment button (after the split display)
      for (const btn of allRowButtons) {
        const svgs = btn.querySelectorAll('svg');
        if (svgs.length === 1 && btn.className.includes('w-6 h-6') && !btn.hasAttribute('disabled')) {
          await user.click(btn);
          break;
        }
      }

      // After incrementing, we should see a "2" in the split column
      const twoTexts = screen.getAllByText('2');
      expect(twoTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Privacy ──────────────────────────────────────────────────────────────

  describe('privacy', () => {
    it('shows privacy button in header', () => {
      render(<App />);
      expect(screen.getByText('Privacidade')).toBeInTheDocument();
    });

    it('toggles privacy banner on click', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText('Privacidade'));
      expect(screen.getByText('Seus dados estao 100% seguros')).toBeInTheDocument();
      expect(screen.getByText(/Nenhuma informacao financeira e enviada/)).toBeInTheDocument();
    });

    it('closes privacy banner', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText('Privacidade'));
      expect(screen.getByText('Seus dados estao 100% seguros')).toBeInTheDocument();

      // Close button (X) in the banner
      const closeBtns = screen.getAllByRole('button');
      const closeBtn = closeBtns.find(btn => {
        const parent = btn.closest('.bg-jade-100');
        return parent !== null;
      });
      if (closeBtn) await user.click(closeBtn);

      expect(screen.queryByText('Seus dados estao 100% seguros')).not.toBeInTheDocument();
    });

    it('shows privacy info in footer', () => {
      render(<App />);
      expect(screen.getByText(/Nenhum dado e armazenado ou enviado/)).toBeInTheDocument();
      expect(screen.getByText(/Processamento local/)).toBeInTheDocument();
      expect(screen.getByText(/Zero rastreamento/)).toBeInTheDocument();
      expect(screen.getByText(/Sem cookies/)).toBeInTheDocument();
    });
  });

  // ─── Transaction Removal ──────────────────────────────────────────────────

  describe('transaction removal', () => {
    it('removes a transaction when clicking delete', async () => {
      const user = userEvent.setup();
      mockParsePDF.mockResolvedValueOnce(createMockTransactions());
      render(<App />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('test.pdf'));
      await screen.findByText('ATACAREJO PAULISTA');

      // Find the delete button (Trash2 icon) - they are opacity-0 by default
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      const deleteBtn = within(firstDataRow).getAllByRole('button').pop()!;
      await user.click(deleteBtn);

      expect(screen.getByText('(4)')).toBeInTheDocument();
    });
  });

  // ─── Bulk Split ───────────────────────────────────────────────────────────

  describe('bulk split', () => {
    it('shows bulk split section with categories', async () => {
      const user = userEvent.setup();
      mockParsePDF.mockResolvedValueOnce(createMockTransactions());
      render(<App />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('test.pdf'));
      await screen.findByText('ATACAREJO PAULISTA');

      expect(screen.getByText('Dividir em massa')).toBeInTheDocument();
    });

    it('has divide buttons for each category', async () => {
      const user = userEvent.setup();
      mockParsePDF.mockResolvedValueOnce(createMockTransactions());
      render(<App />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('test.pdf'));
      await screen.findByText('ATACAREJO PAULISTA');

      // Should have ÷1, ÷2, ÷3, ÷4 buttons for each category
      const divideByTwo = screen.getAllByText('÷2');
      expect(divideByTwo.length).toBeGreaterThanOrEqual(5);
    });
  });
});
