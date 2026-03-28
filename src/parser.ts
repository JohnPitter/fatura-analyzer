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

  return transactions;
}

export function parseBradesco(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  // Bradesco format: "DD/MM DESCRIPTION CITY VALUE"
  // or: "DD/MM DESCRIPTION XX/YY CITY VALUE"
  const txRegex = /^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+(?:-)?)\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip non-transaction lines
    if (line.includes('PAGTO') || line.includes('Total para') || line.includes('Total da fatura') ||
        line.includes('Limite') || line.includes('Taxas') || line.includes('Programa') ||
        line.includes('Pontos') || line.includes('Saldo de pontos') || line.includes('Central') ||
        line.includes('Mensagem') || line.includes('Pagamento da fatura') || line.includes('Atenção') ||
        line.includes('Parcelado Fácil') || line.includes('SAC:') || line.includes('Ouvidoria') ||
        line.includes('Baixe') || line.includes('Fatura Mensal') || line.includes('Número do') ||
        line.includes('Lançamentos') || line.includes('Cotação') || line.includes('Histórico') ||
        (line.includes('Data') && line.includes('Cidade')) || line.includes('do Dólar') ||
        line.includes('JOAO PEDRO') || line.includes('anterior') || line.includes('Demais') ||
        line.includes('Cart') || line.includes('Compras R$') || line.includes('Saque R$') ||
        line.includes('CET') || line.includes('Crediário') || line.includes('Rotativo') ||
        line.includes('legislação') || line.includes('vencimento') || line.includes('Novo teto') ||
        line.includes('Valor em R$') || line.includes('Valor original') || line.includes('encargos financeiros') ||
        line.includes('% sobre') || line.includes('juros e encargos') || line.includes('apresentados') ||
        line.includes('máximo') || line.includes('rotativo') || line.includes('cobrada') ||
        line.includes('operação') || line.includes('FIDELIDADE') || line.includes('Associado') ||
        line.includes('consolidada') || line.includes('expirar') || line.includes('pontoslivelo') ||
        line.includes('central de atendimento') || line.includes('3004-8858') ||
        line.includes('0800') || line.includes('banco.bradesco') ||
        line.includes('Defici') || line.includes('Reclama') || line.includes('satisfeito') ||
        line.includes('Exterior') || line.includes('Consultas') ||
        line.match(/^\d{12,}/) || line.match(/^P.gina/) ||
        line.match(/^R\$/) || line.includes('pr.ximas faturas') ||
        // Encargos and IOF lines (financial charges noise)
        /Encargos sobre/i.test(line) ||
        /IOF di[aá]rio/i.test(line) ||
        /IOF adicional/i.test(line) ||
        // Rate table labels (right-side column data)
        /^Pagamento de Contas$/i.test(line) ||
        /^Parcelamento Fatura$/i.test(line) ||
        /^Compras Parceladas$/i.test(line) ||
        /^Saque [àa] Vista$/i.test(line) ||
        /com Juros/i.test(line) ||
        // Lines with multiple percentage values (rate tables)
        /\d+,\d+%\s+\d+,\d+%/.test(line) ||
        // Lines with multiple R$ amounts (limit info from right column)
        /R\$\s*[\d.,]+\s+R\$\s*[\d.,]+/.test(line) ||
        // Installment-only markers: lines that are just "XX/YY" with nothing else
        /^\d{2}\/\d{2}\s*$/.test(line) ||
        // Saque limit info lines (contain "Saque" with R$ amounts)
        (/Saque/.test(line) && /R\$/.test(line))) {
      continue;
    }

    const match = line.match(txRegex);
    if (match) {
      let [, date, rawDesc, valueStr] = match;

      // Skip negative values (payments)
      if (valueStr.endsWith('-')) continue;

      const value = parseValue(valueStr);
      if (value <= 0) continue;

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
      // Remove trailing city names (usually last word or two)
      const cityPattern = /\s+(SAO PAULO|RECIFE|PAULISTA|OLINDA|BARUERI|OSASCO|IGARASSU|SANTO ANDRE|NAVEGANTES|SOROCABA|CAMARAGIBE|CURITIBA|Sao Paulo|Paulista|Olinda|Recife|S o Paulo|SANTANA DE|Brasilia|PA)\s*$/i;
      description = description.replace(cityPattern, '').trim();

      // Remove installment from description
      if (installment) {
        description = description.replace(new RegExp(`\\s*${installment.replace('/', '\\/')}\\s*`), ' ').trim();
      }

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
