import * as pdfjsLib from 'pdfjs-dist';
import type { Transaction, Category } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

let idCounter = 0;
function nextId(): string {
  return `tx-${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

const CATEGORY_KEYWORDS: Record<string, Category> = {
  // Itaú explicit categories
  'restaurante': 'restaurante',
  'supermercado': 'supermercado',
  'saude': 'saude',
  'educacao': 'educacao',
  'vestuario': 'vestuario',
  'servicos': 'servicos',
  'outros': 'outros',
  'eletronics': 'tecnologia',
  'health': 'saude',
  'money': 'entretenimento',
  'retail': 'vestuario',

  // Keyword-based categorization
  'mcdonalds': 'restaurante',
  'brotfabrik': 'restaurante',
  'pizza': 'restaurante',
  'coffee': 'restaurante',
  'gran coffee': 'restaurante',
  'panificadora': 'alimentacao',
  'padaria': 'alimentacao',
  'felix e cavalcanti': 'supermercado',
  'atacarejo': 'supermercado',
  'verdao': 'supermercado',
  'ferreira costa': 'moradia',
  'maralco': 'alimentacao',

  'farmacia': 'farmacia',
  'raiadrogasil': 'farmacia',
  'drogavet': 'saude',
  'drogasil': 'farmacia',
  'farmacia beira': 'farmacia',

  'petz': 'pet',

  'mercadolivre': 'outros',
  'shopee': 'outros',
  'amazon': 'tecnologia',
  'magalu': 'tecnologia',
  'lojas riachuelo': 'vestuario',
  'usaflex': 'vestuario',
  'currys': 'tecnologia',

  'steam': 'entretenimento',
  'riot': 'entretenimento',

  'starlink': 'assinaturas',
  'google youtube': 'assinaturas',
  'youtube': 'assinaturas',
  'amazonprime': 'assinaturas',
  'gazeta': 'assinaturas',
  'clube livelo': 'assinaturas',
  'claro': 'assinaturas',

  'openrouter': 'tecnologia',
  'claude.ai': 'tecnologia',
  'openai': 'tecnologia',
  'chatgpt': 'tecnologia',
  'nuvem': 'tecnologia',

  'htmmentor': 'educacao',
  'htm': 'educacao',
  'kiwify': 'educacao',
  'descomplica': 'educacao',
  'arcada': 'educacao',
  'edzabiblia': 'educacao',

  'hosting': 'tecnologia',
  'hostin': 'tecnologia',

  'ior': 'saude',
  'hna': 'saude',

  'parking': 'transporte',
  'postos de servico': 'transporte',
  'postos': 'transporte',
  'combustivel': 'transporte',

  'tap air': 'transporte',
  'cvc': 'transporte',

  'iof': 'financeiro',
  'encargos': 'financeiro',
  'juros': 'financeiro',
  'parcelamento fatura': 'financeiro',

  'pix parc': 'financeiro',
  'picpay': 'financeiro',

  'shop patteo': 'outros',
  'mp*melimais': 'outros',
  'rizonildo': 'outros',
  'brasil paral': 'assinaturas',
};

export function categorize(description: string, itauCategory?: string): Category {
  const desc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (itauCategory) {
    const cat = itauCategory.toLowerCase().trim();
    if (cat in CATEGORY_KEYWORDS) {
      return CATEGORY_KEYWORDS[cat];
    }
  }

  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (desc.includes(keyword.toLowerCase())) {
      return category;
    }
  }

  return 'outros';
}

export function parseValue(valueStr: string): number {
  const cleaned = valueStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

export function parseItau(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  // Match patterns like: "20/02 DROGAVET RECIF 02/02 94,00"
  // or "11/09 KIWIFY *Ebook5 06/06 5,61"
  // The Itaú format has category on the next line
  const txRegex = /^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)$/;

  // Track when we enter the "future installments" section — everything after is NOT current
  let inFutureInstallments = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect "Compras parceladas - próximas faturas" section — stop parsing current transactions
    // pdfjs may split accented chars with spaces: "pr ó ximas" instead of "próximas"
    const lineNorm = line.replace(/\s+/g, ' ');
    if (/Compras parceladas/i.test(lineNorm) && /pr\s*[oó]\s*ximas/i.test(lineNorm)) {
      inFutureInstallments = true;
      continue;
    }
    if (/^Compras parceladas/i.test(lineNorm) && !lineNorm.includes('juros')) {
      inFutureInstallments = true;
      continue;
    }

    if (inFutureInstallments) continue;

    // Skip payment lines, headers, totals, subtotals, limit info, and summary lines
    if (line.includes('PAGAMENTO') || line.includes('Total dos') || line.includes('Total para') ||
        line.includes('Limite') || line.includes('Previsão') || line.includes('Próxima fatura') ||
        line.includes('Demais faturas') ||
        line.includes('Encargos cobrados') || line.includes('Juros') ||
        line.includes('Novo teto') || line.includes('Simulação') ||
        line.includes('Fique atento') || line.includes('contratação') ||
        line.includes('Dólar') || line.includes('Repasse') || line.includes('4004 4828') ||
        line.includes('0800') ||
        // Subtotal line: "Lançamentos no cartão VALUE" (pdfjs may add spaces around accents)
        /Lan\s*[çc]\s*amentos no cart/i.test(lineNorm) ||
        // Total lines
        /Total dos lan\s*[çc]\s*amentos/i.test(lineNorm) ||
        // Limit info lines
        /Limite de cr\s*[eé]\s*dito/i.test(lineNorm) ||
        /Limite dispon\s*[ií]\s*vel/i.test(lineNorm) ||
        /Limite total/i.test(lineNorm) ||
        // Summary info
        /Pr\s*[oó]\s*xima fatura/i.test(lineNorm) ||
        /Total para pr\s*[oó]\s*ximas/i.test(lineNorm) ||
        // "Simulação de Compras" — rate simulation header
        /Simula\s*[çc]\s*[ãa]\s*o/i.test(lineNorm)) {
      continue;
    }

    const match = line.match(txRegex);
    if (match) {
      const [, date, rawDesc, valueStr] = match;
      const value = parseValue(valueStr);

      if (value <= 0) continue;

      // Check if next line is a category (Itaú format)
      let itauCategory: string | undefined;
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const catMatch = nextLine.match(/^(restaurante|supermercado|saude|educacao|vestuario|servicos|outros|ELETRONICS|HEALTH|MONEY|RETAIL)\s/i);
        if (catMatch) {
          itauCategory = catMatch[1];
        }
      }

      // Clean description - remove installment info like "02/02" or "06/12"
      let description = rawDesc.trim();
      const installmentMatch = description.match(/\s(\d{2}\/\d{2})\s*$/);
      let installment: string | undefined;
      if (installmentMatch) {
        installment = installmentMatch[1];
        description = description.replace(/\s\d{2}\/\d{2}\s*$/, '').trim();
      }

      transactions.push({
        id: nextId(),
        date,
        description,
        value,
        category: categorize(description, itauCategory),
        source: 'itau',
        installment,
        splitPeople: 1,
        isPersonal: true,
      });
    }
  }

  // Also parse international transactions
  const intlRegex = /^(\d{2}\/\d{2})\s*(.+?)\s+([\d.,]+)$/;
  let inInternational = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('Lançamentos internacionais') || line.includes('internacionais')) {
      inInternational = true;
      continue;
    }
    if (line.includes('Total transações') || line.includes('Total transa')) {
      inInternational = false;
      continue;
    }

    if (inInternational) {
      // Skip USD/BRL detail lines and currency conversion info
      if (line.includes('USD') || line.includes('BRL') || line.includes('Dólar') ||
          line.includes('D dollar') || line.includes('Convers')) {
        continue;
      }

      const match = line.match(intlRegex);
      if (match) {
        const [, date, rawDesc, valueStr] = match;
        const value = parseValue(valueStr);
        if (value > 0) {
          const description = rawDesc.trim();
          // Check if this is a duplicate (already parsed from the main section)
          const isDuplicate = transactions.some(t => t.date === date && Math.abs(t.value - value) < 0.01);
          if (!isDuplicate) {
            transactions.push({
              id: nextId(),
              date,
              description,
              value,
              category: categorize(description),
              source: 'itau',
              splitPeople: 1,
              isPersonal: true,
            });
          }
        }
      }
    }
  }

  // Capture "Repasse de IOF em R$ XX,XX" line (real charge, no leading date)
  for (const rawLine of lines) {
    const ln = rawLine.trim();
    const repasseMatch = ln.match(/Repasse\s+de\s+IOF\s+em\s+R\$\s*([\d.,]+)/i);
    if (repasseMatch) {
      const value = parseValue(repasseMatch[1]);
      if (value > 0) {
        transactions.push({
          id: nextId(),
          date: '',
          description: 'Repasse de IOF',
          value,
          category: 'financeiro',
          source: 'itau',
          splitPeople: 1,
          isPersonal: true,
        });
      }
    }
  }

  return transactions;
}

export function parseBradesco(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  // Bradesco PDFs have 2 columns — pdfjs merges them by Y coordinate.
  // Lines starting with DD/MM are transactions, even if right-column text is appended.
  // Strategy: for DD/MM lines, extract value with a lenient regex that doesn't require end-of-line.

  // Brazilian currency value: 1-6 digits with optional dot thousands separator, comma, 2 decimals
  // Matches: "326,05", "1.544,55", "3.062,08-"
  const brValuePattern = /(\d{1,3}(?:\.\d{3})*,\d{2})(-)?/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line starts with a date (DD/MM) — potential transaction
    const dateMatch = line.match(/^(\d{2}\/\d{2})\s+(.+)/);

    if (dateMatch) {
      const [, date, rest] = dateMatch;

      // Skip payment lines and totals (these also start with dates)
      if (rest.includes('PAGTO') || rest.includes('Total para') || rest.includes('Total da fatura')) {
        continue;
      }

      // Find the Brazilian currency value in the rest of the line
      const valueMatch = rest.match(brValuePattern);
      if (!valueMatch) continue;

      const valueStr = valueMatch[1];
      const isNegative = valueMatch[2] === '-';
      if (isNegative) continue;

      const value = parseValue(valueStr);
      if (value <= 0) continue;

      // Extract description: everything between the date and the value
      const valueIndex = rest.indexOf(valueMatch[0]);
      let rawDesc = rest.substring(0, valueIndex).trim();

      // Extract installment info (XX/YY pattern in description)
      let installment: string | undefined;
      const installmentMatch = rawDesc.match(/(\d{2}\/\d{2})\s+\S+\s*$/);
      if (installmentMatch) {
        const potentialInstallment = installmentMatch[1];
        const [num, total] = potentialInstallment.split('/').map(Number);
        if (num > 0 && total > 1 && num <= total && total <= 48) {
          installment = potentialInstallment;
        }
      }

      // Clean description: remove city at the end
      let description = rawDesc.trim();
      const cityPattern = /\s+(SAO PAULO|RECIFE|PAULISTA|OLINDA|BARUERI|OSASCO|IGARASSU|SANTO ANDRE|NAVEGANTES|SOROCABA|CAMARAGIBE|CURITIBA|Sao Paulo|Paulista|Olinda|Recife|S o Paulo|SANTANA DE|Brasilia|PA)\s*$/i;
      description = description.replace(cityPattern, '').trim();

      // Remove installment from description
      if (installment) {
        description = description.replace(new RegExp(`\\s*${installment.replace('/', '\\/')}\\s*`), ' ').trim();
      }

      // Skip if description is empty or looks like a date-only line (e.g. "20/03/2026")
      if (!description || /^\d{2}\/\d{2}\/\d{4}$/.test(description)) continue;

      transactions.push({
        id: nextId(),
        date,
        description,
        value,
        category: categorize(description),
        source: 'bradesco',
        installment,
        splitPeople: 1,
        isPersonal: true,
      });
      continue;
    }

    // Non-date lines: skip most, but don't need complex filters since
    // the date check above handles all transactions.
    // Only installment-marker lines (just "XX/YY") and noise are left.
  }

  // Second pass: capture Encargos/IOF lines (they don't start with DD/MM but ARE real charges)
  // pdfjs may extract as "Encargos sobre parcelado" or "Encargos sobreparcelado"
  const financialRegex = /^(Encargos\s+sobre\s*\w*|IOF\s+di[aá]rio\s+sobre\s*\w*|IOF\s+adicional\s+sobre\s*\w*)\s+(\d{2}\/\d{2})\s+([\d.,]+)/i;
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(financialRegex);
    if (match) {
      const [, desc, installment, valueStr] = match;
      const value = parseValue(valueStr);
      if (value > 0) {
        transactions.push({
          id: nextId(),
          date: installment,
          description: desc.trim(),
          value,
          category: 'financeiro',
          source: 'bradesco',
          installment,
          splitPeople: 1,
          isPersonal: true,
        });
      }
    }
  }

  return transactions;
}

export function detectSource(text: string): 'itau' | 'bradesco' {
  if (text.includes('Itaú') || text.includes('itau') || text.includes('4004 4828') || text.includes('Lançamentos: compras e saques')) {
    return 'itau';
  }
  return 'bradesco';
}

export async function parsePDF(file: File): Promise<Transaction[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  // Also get line-by-line text
  let lineText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((item) => 'str' in item && 'transform' in item);

    // Group by Y coordinate to form lines
    const lineMap = new Map<number, { x: number; text: string }[]>();
    for (const item of items) {
      const rec = item as { str: string; transform: number[] };
      const y = Math.round(rec.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x: rec.transform[4], text: rec.str });
    }

    // Sort by Y (descending = top to bottom) then X
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      lineText += items.map(i => i.text).join(' ') + '\n';
    }
  }

  const source = detectSource(fullText);

  if (source === 'itau') {
    return parseItau(lineText);
  }
  return parseBradesco(lineText);
}
