import * as pdfjsLib from 'pdfjs-dist';
import type { Transaction, Category } from './types';
import { extractInstallment } from './utils';

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

  // Itau PDFs have 2 columns that pdfjs merges by Y coordinate.
  // A single line can contain BOTH a payment and a transaction, e.g.:
  // "27/02 PAGAMENTO PIX -4.187,95 20/02 DROGAVET RECIF 02/02 94,00"
  // Strategy: find ALL "DD/MM description value" segments within each line.

  const brValue = /(\d{1,3}(?:\.\d{3})*,\d{2})/;
  const seen = new Set<string>();
  let inFutureInstallments = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNorm = line.replace(/\s+/g, ' ');

    // Detect "Compras parceladas - proximas faturas" section
    if (/Compras parceladas/i.test(lineNorm) && /pr\s*[oó]\s*ximas/i.test(lineNorm)) {
      inFutureInstallments = true;
      continue;
    }
    if (/^Compras parceladas/i.test(lineNorm) && !lineNorm.includes('juros')) {
      inFutureInstallments = true;
      continue;
    }
    if (inFutureInstallments) continue;

    // Skip lines without any date pattern
    if (!/\d{2}\/\d{2}/.test(line)) continue;

    // Skip known non-transaction lines
    if (/Lan\s*[çc]\s*amentos no cart/i.test(lineNorm) ||
        /Total dos lan\s*[çc]\s*amentos/i.test(lineNorm) ||
        /Limite/i.test(lineNorm) ||
        /Pr\s*[oó]\s*xima fatura/i.test(lineNorm) ||
        /Total para pr\s*[oó]\s*ximas/i.test(lineNorm) ||
        /Simula\s*[çc]\s*[ãa]\s*o/i.test(lineNorm) ||
        /Encargos cobrados/i.test(line) ||
        line.includes('4004 4828') || line.includes('0800') ||
        /Previs\s*[ãa]\s*o/i.test(lineNorm)) {
      continue;
    }

    // Find all DD/MM positions in the line to extract multiple transactions
    const datePositions: number[] = [];
    const dateRegex = /(?:^|\s)(\d{2}\/\d{2})\s/g;
    let dm;
    while ((dm = dateRegex.exec(line)) !== null) {
      datePositions.push(dm.index + (dm[0][0] === ' ' ? 1 : 0));
    }

    for (const pos of datePositions) {
      const segment = line.substring(pos).trim();
      const segMatch = segment.match(/^(\d{2}\/\d{2})\s+(.+)/);
      if (!segMatch) continue;

      const [, date, rest] = segMatch;

      // Find Brazilian currency value
      const valueMatch = rest.match(brValue);
      if (!valueMatch) continue;

      const value = parseValue(valueMatch[1]);
      if (value <= 0) continue;

      // Description: everything between date and value
      const valueIndex = rest.indexOf(valueMatch[0]);
      let rawDesc = rest.substring(0, valueIndex).trim();

      // Skip payment/total/noise entries
      if (rawDesc.includes('PAGAMENTO') || rawDesc.includes('Total')) continue;
      if (!rawDesc) continue;
      if (/D[oó]lar|Convers|Repasse|Juros|Fique/i.test(rawDesc)) continue;
      if (/USD|BRL/.test(rawDesc)) continue;

      // Check next line for Itau category
      let itauCategory: string | undefined;
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const catMatch = nextLine.match(/^(restaurante|supermercado|saude|educacao|vestuario|servicos|outros|ELETRONICS|HEALTH|MONEY|RETAIL)\s/i);
        if (catMatch) {
          itauCategory = catMatch[1];
        }
      }

      // Extract installment info
      const { installment, cleaned: description } = extractInstallment(rawDesc.trim());

      // Deduplicate: O(1) lookup via Set
      const dedupeKey = `${date}|${description}|${Math.round(value * 100)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

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

  // NOTE: International transactions (OPENROUTER, CLAUDE.AI, OPENAI) are already captured
  // in the main loop above because pdfjs groups text by Y-coordinate, mixing both columns.
  // No separate international parsing pass is needed.

  // Capture "Repasse de IOF em R$ XX,XX" line (real charge, no leading date)
  // Use the last transaction date as context for this charge
  const lastDate = transactions.length > 0 ? transactions[transactions.length - 1].date : '--/--';
  for (const rawLine of lines) {
    const ln = rawLine.trim();
    const repasseMatch = ln.match(/Repasse\s+de\s+IOF\s+em\s+R\$\s*([\d.,]+)/i);
    if (repasseMatch) {
      const value = parseValue(repasseMatch[1]);
      if (value > 0) {
        transactions.push({
          id: nextId(),
          date: lastDate,
          description: 'Repasse de IOF (internacional)',
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

      // Clean description: remove city at the end
      let cleanedDesc = rawDesc.trim();
      const cityPattern = /\s+(SAO PAULO|RECIFE|PAULISTA|OLINDA|BARUERI|OSASCO|IGARASSU|SANTO ANDRE|NAVEGANTES|SOROCABA|CAMARAGIBE|CURITIBA|Sao Paulo|Paulista|Olinda|Recife|S o Paulo|SANTANA DE|Brasilia|PA)\s*$/i;
      cleanedDesc = cleanedDesc.replace(cityPattern, '').trim();

      // Extract installment info
      const { installment, cleaned: description } = extractInstallment(cleanedDesc);

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

export class InvalidPDFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPDFError';
  }
}

/**
 * Validates that the PDF content matches expected credit card bill layout.
 * Throws InvalidPDFError with a user-friendly message if not valid.
 */
function validateBillContent(fullText: string, fileName: string): void {
  const text = fullText.toLowerCase();

  // Must have minimum text content (not a scanned image or empty PDF)
  if (fullText.trim().length < 100) {
    throw new InvalidPDFError(
      `"${fileName}" parece estar vazio ou ser uma imagem escaneada. Envie a fatura em PDF digital (nao foto/scan).`
    );
  }

  // Check for credit card bill markers from either bank
  const isItau = text.includes('itaú') || text.includes('itau') || text.includes('4004 4828') ||
    text.includes('lançamentos: compras e saques') || text.includes('lancamentos');
  const isBradesco = text.includes('bradesco') || text.includes('fatura mensal') ||
    text.includes('histórico de lançamentos') || text.includes('historico de lancamentos');

  // Check for common bill keywords
  const hasBillKeywords =
    (text.includes('fatura') || text.includes('lançamento') || text.includes('lancamento')) &&
    (text.includes('total') || text.includes('valor')) &&
    /\d{2}\/\d{2}/.test(text);

  if (!isItau && !isBradesco && !hasBillKeywords) {
    throw new InvalidPDFError(
      `"${fileName}" nao parece ser uma fatura de cartao de credito. Somente faturas do Itau e Bradesco sao suportadas.`
    );
  }

  // Check it's not a bank statement (extrato) instead of credit card bill
  if ((text.includes('extrato') || text.includes('conta corrente')) &&
      !text.includes('fatura') && !text.includes('cartão') && !text.includes('cartao')) {
    throw new InvalidPDFError(
      `"${fileName}" parece ser um extrato bancario, nao uma fatura de cartao de credito.`
    );
  }

  // Check it has transaction-like patterns (DD/MM followed by text and values)
  const txPattern = /\d{2}\/\d{2}\s+\S+.*\d+,\d{2}/;
  if (!txPattern.test(fullText)) {
    throw new InvalidPDFError(
      `"${fileName}" nao contem transacoes no formato esperado. Verifique se e uma fatura de cartao do Itau ou Bradesco.`
    );
  }
}

export async function parsePDF(file: File): Promise<Transaction[]> {
  // Validate file type
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new InvalidPDFError(
      `"${file.name}" nao e um arquivo PDF. Envie apenas faturas em formato PDF.`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch {
    throw new InvalidPDFError(
      `"${file.name}" nao pode ser lido como PDF. O arquivo pode estar corrompido ou protegido por senha.`
    );
  }

  if (pdf.numPages === 0) {
    throw new InvalidPDFError(`"${file.name}" esta vazio (0 paginas).`);
  }

  // Single pass: extract both fullText (for validation) and lineText (for parsing)
  let fullText = '';
  let lineText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((item) => 'str' in item && 'transform' in item);

    // Build fullText for validation
    fullText += items.map((item) => (item as { str: string }).str).join(' ') + '\n';

    // Build lineText grouped by Y coordinate
    const lineMap = new Map<number, { x: number; text: string }[]>();
    for (const item of items) {
      const rec = item as { str: string; transform: number[] };
      const y = Math.round(rec.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x: rec.transform[4], text: rec.str });
    }
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const lineItems = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      lineText += lineItems.map(li => li.text).join(' ') + '\n';
    }
  }

  // Validate bill content before parsing
  validateBillContent(fullText, file.name);

  const source = detectSource(fullText);
  const transactions = source === 'itau' ? parseItau(lineText) : parseBradesco(lineText);

  // Post-parse validation: must have found at least some transactions
  if (transactions.length === 0) {
    throw new InvalidPDFError(
      `"${file.name}" foi reconhecido como fatura ${source === 'itau' ? 'Itau' : 'Bradesco'}, mas nenhuma transacao foi encontrada. O layout pode ser diferente do esperado.`
    );
  }

  return transactions;
}
