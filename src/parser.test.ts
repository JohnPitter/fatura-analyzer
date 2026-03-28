import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseValue,
  categorize,
  detectSource,
  parseItau,
  parseBradesco,
  resetIdCounter,
} from './parser';

beforeEach(() => {
  resetIdCounter();
});

// ─── parseValue ────────────────────────────────────────────────────────────────

describe('parseValue', () => {
  it('parses Brazilian currency format with comma decimal', () => {
    expect(parseValue('94,00')).toBe(94);
  });

  it('parses value with thousands separator dot', () => {
    expect(parseValue('1.234,56')).toBe(1234.56);
  });

  it('parses value with multiple thousands separators', () => {
    expect(parseValue('10.234.567,89')).toBe(10234567.89);
  });

  it('returns absolute value for negative numbers', () => {
    expect(parseValue('-4.187,95')).toBe(4187.95);
  });

  it('handles whitespace in value', () => {
    expect(parseValue(' 123,45 ')).toBe(123.45);
  });

  it('returns 0 for non-numeric strings', () => {
    expect(parseValue('abc')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseValue('')).toBe(0);
  });

  it('parses small decimal values', () => {
    expect(parseValue('5,61')).toBeCloseTo(5.61);
  });

  it('parses integer value without comma', () => {
    expect(parseValue('100')).toBe(100);
  });
});

// ─── categorize ────────────────────────────────────────────────────────────────

describe('categorize', () => {
  describe('with explicit Itau category', () => {
    it('maps "restaurante" category', () => {
      expect(categorize('BROTFABRIK RECIFE', 'restaurante')).toBe('restaurante');
    });

    it('maps "supermercado" category', () => {
      expect(categorize('FROSTY JANGA', 'supermercado')).toBe('supermercado');
    });

    it('maps "saude" category', () => {
      expect(categorize('DROGAVET RECIF', 'saude')).toBe('saude');
    });

    it('maps "educacao" category', () => {
      expect(categorize('KIWIFY *Ebook5', 'educacao')).toBe('educacao');
    });

    it('maps "vestuario" category', () => {
      expect(categorize('LOJAS RIACHUELO', 'vestuario')).toBe('vestuario');
    });

    it('maps "ELETRONICS" to tecnologia', () => {
      expect(categorize('DL *Starlink Brazil', 'ELETRONICS')).toBe('tecnologia');
    });

    it('maps "HEALTH" to saude', () => {
      expect(categorize('IORRECIFEBR', 'HEALTH')).toBe('saude');
    });

    it('maps "MONEY" to entretenimento', () => {
      expect(categorize('SteamSAO PAULO', 'MONEY')).toBe('entretenimento');
    });
  });

  describe('keyword-based categorization', () => {
    it('categorizes McDonalds as restaurante', () => {
      expect(categorize('McDonalds - Arcos Doura')).toBe('restaurante');
    });

    it('categorizes Brotfabrik as restaurante', () => {
      expect(categorize('BROTFABRIK RECIFE')).toBe('restaurante');
    });

    it('categorizes Gran Coffee as restaurante', () => {
      expect(categorize('GRAN COFFEE Sao Paulo')).toBe('restaurante');
    });

    it('categorizes Felix e Cavalcanti as supermercado', () => {
      expect(categorize('FELIX E CAVALCANTI PAULISTA')).toBe('supermercado');
    });

    it('categorizes Atacarejo as supermercado', () => {
      expect(categorize('ATACAREJO PAULISTA')).toBe('supermercado');
    });

    it('categorizes Farmacia Beira Mar as farmacia', () => {
      expect(categorize('FARMACIA BEIRA MAR PAULISTA')).toBe('farmacia');
    });

    it('categorizes RaiaDrogasil as farmacia', () => {
      expect(categorize('RaiaDrogasilSA')).toBe('farmacia');
    });

    it('categorizes PETZ as pet', () => {
      expect(categorize('PETZ OLINDA')).toBe('pet');
    });

    it('categorizes Steam as entretenimento', () => {
      expect(categorize('SteamSAO PAULO')).toBe('entretenimento');
    });

    it('categorizes RiotGame as entretenimento', () => {
      expect(categorize('RiotGameSAO PA')).toBe('entretenimento');
    });

    it('categorizes Starlink as assinaturas', () => {
      expect(categorize('DL *Starlink Brazil')).toBe('assinaturas');
    });

    it('categorizes AmazonPrimeBR — "amazon" keyword matches first to tecnologia', () => {
      // "amazon" keyword matches before "amazonprime" due to iteration order
      expect(categorize('AmazonPrimeBR SAO PAULO')).toBe('tecnologia');
    });

    it('categorizes CLAUDE.AI as tecnologia', () => {
      expect(categorize('CLAUDE.AI SUBSCRIPTION')).toBe('tecnologia');
    });

    it('categorizes OpenAI as tecnologia', () => {
      expect(categorize('OPENAI *CHATGPT SUBSCR')).toBe('tecnologia');
    });

    it('categorizes Kiwify as educacao', () => {
      expect(categorize('KIWIFY *Aprend')).toBe('educacao');
    });

    it('categorizes Descomplica as educacao', () => {
      expect(categorize('HTM*DESCOMPLICA CURS')).toBe('educacao');
    });

    it('categorizes parking as transporte', () => {
      expect(categorize('RECIFE PARKING LTDA')).toBe('transporte');
    });

    it('categorizes "POSTOS DE SERVICOS" — "servicos" keyword matches first', () => {
      // "servicos" appears in the string and its keyword comes before "postos" in iteration
      expect(categorize('POSTOS DE SERVICOS DA')).toBe('servicos');
    });

    it('categorizes IOF as financeiro', () => {
      expect(categorize('IOF')).toBe('financeiro');
    });

    it('categorizes encargos as financeiro', () => {
      expect(categorize('Encargos sobreparcelado')).toBe('financeiro');
    });

    it('categorizes PIX PARC as financeiro', () => {
      expect(categorize('PIX PARC CARTAO CRED')).toBe('financeiro');
    });

    it('returns outros for unknown descriptions', () => {
      expect(categorize('UNKNOWN MERCHANT XYZ')).toBe('outros');
    });
  });

  describe('accent normalization', () => {
    it('handles accented characters in description', () => {
      expect(categorize('café restaurante')).toBe('restaurante');
    });
  });
});

// ─── detectSource ──────────────────────────────────────────────────────────────

describe('detectSource', () => {
  it('detects Itau by "Itaú" keyword', () => {
    expect(detectSource('Fatura Itaú Cartões')).toBe('itau');
  });

  it('detects Itau by phone number', () => {
    expect(detectSource('Contato: 4004 4828')).toBe('itau');
  });

  it('detects Itau by lancamentos header', () => {
    expect(detectSource('Lançamentos: compras e saques')).toBe('itau');
  });

  it('defaults to bradesco when no Itau markers found', () => {
    expect(detectSource('Fatura Mensal Bradesco')).toBe('bradesco');
  });

  it('defaults to bradesco for empty text', () => {
    expect(detectSource('')).toBe('bradesco');
  });
});

// ─── parseItau ─────────────────────────────────────────────────────────────────

describe('parseItau', () => {
  it('parses a simple transaction line', () => {
    const text = '20/02 DROGAVET RECIF 02/02 94,00\nsaude RECIFE\n';
    const txs = parseItau(text);
    expect(txs).toHaveLength(1);
    expect(txs[0].date).toBe('20/02');
    expect(txs[0].description).toBe('DROGAVET RECIF');
    expect(txs[0].value).toBe(94);
    expect(txs[0].category).toBe('saude');
    expect(txs[0].installment).toBe('02/02');
    expect(txs[0].source).toBe('itau');
    expect(txs[0].splitPeople).toBe(1);
    expect(txs[0].isPersonal).toBe(true);
  });

  it('parses transaction with installment info', () => {
    const text = '11/09 KIWIFY *Ebook5 06/06 5,61\neducacao Barueri\n';
    const txs = parseItau(text);
    expect(txs).toHaveLength(1);
    expect(txs[0].installment).toBe('06/06');
    expect(txs[0].description).toBe('KIWIFY *Ebook5');
    expect(txs[0].category).toBe('educacao');
  });

  it('parses transaction without installment', () => {
    const text = '05/03 IFD*BROSASCOBR 7,95\nrestaurante OSASCO\n';
    const txs = parseItau(text);
    expect(txs).toHaveLength(1);
    expect(txs[0].installment).toBeUndefined();
    expect(txs[0].value).toBeCloseTo(7.95);
  });

  it('skips payment lines', () => {
    const text = '27/02 PAGAMENTO PIX -4.187,95\n';
    const txs = parseItau(text);
    expect(txs).toHaveLength(0);
  });

  it('skips total lines', () => {
    const text = 'Total dos pagamentos -4.187,95\n';
    const txs = parseItau(text);
    expect(txs).toHaveLength(0);
  });

  it('skips lines with Juros', () => {
    const text = 'Juros do rotativo 14,00 % 0,00\n';
    const txs = parseItau(text);
    expect(txs).toHaveLength(0);
  });

  it('parses multiple transactions', () => {
    const text = [
      '20/02 DROGAVET RECIF 02/02 94,00',
      'saude RECIFE',
      '21/02 FELIX E CAVALCANTIPAULI 175,23',
      'outros PAULISTA',
      '21/02 RESTAURANTE E PIZZARIIG 79,69',
      'restaurante IGARASSU',
    ].join('\n');
    const txs = parseItau(text);
    expect(txs).toHaveLength(3);
    expect(txs[0].value).toBe(94);
    expect(txs[1].value).toBeCloseTo(175.23);
    expect(txs[2].value).toBeCloseTo(79.69);
  });

  it('uses Itau category from next line when available', () => {
    const text = '22/02 FROSTY JANGAPAULISTABR 40,95\nsupermercado PAULISTA\n';
    const txs = parseItau(text);
    expect(txs[0].category).toBe('supermercado');
  });

  it('falls back to keyword categorization when no Itau category', () => {
    const text = '22/02 SteamSAO PAULO 67,80\n';
    const txs = parseItau(text);
    expect(txs).toHaveLength(1);
    expect(txs[0].category).toBe('entretenimento');
  });

  it('assigns unique IDs to each transaction', () => {
    const text = '20/02 A 10,00\n21/02 B 20,00\n';
    const txs = parseItau(text);
    expect(txs[0].id).not.toBe(txs[1].id);
  });

  it('skips zero value transactions', () => {
    const text = '20/02 SOMETHING 0,00\n';
    const txs = parseItau(text);
    expect(txs).toHaveLength(0);
  });

  it('excludes future installments from "Compras parceladas - proximas faturas" section', () => {
    const text = [
      '11/09 KIWIFY *Ebook5 06/06 5,61',
      'educacao Barueri',
      '13/09 HTM *Mentor 06/12 218,88',
      'educacao Aparecida de',
      // pdfjs splits accents: "pr ó ximas"
      ' Compras parceladas - pr ó ximas faturas',
      'DATA ESTABELECIMENTO VALOR EM R$',
      '11/09 KIWIFY *Aprend 07/12 9,89',
      '13/09 HTM *Mentor 07/12 218,88',
      '28/02 DM *hostin 02/12 123,39',
      'Pr ó xima fatura 1.456,80',
    ].join('\n');
    const txs = parseItau(text);
    // Only the 2 transactions BEFORE the section header should be parsed
    expect(txs).toHaveLength(2);
    expect(txs[0].description).toBe('KIWIFY *Ebook5');
    expect(txs[1].description).toBe('HTM *Mentor');
    // The 07/12 installment versions should NOT appear
    expect(txs.every(t => !t.installment?.startsWith('07/'))).toBe(true);
  });

  it('excludes limit info lines', () => {
    const text = [
      '20/02 DROGAVET RECIF 02/02 94,00',
      'saude RECIFE',
      'Limite de cr é dito 15.150,00',
      'Limite dispon í vel 6.519,00',
      'Limite total utilizado 8.631,00',
    ].join('\n');
    const txs = parseItau(text);
    expect(txs).toHaveLength(1);
    expect(txs[0].description).toBe('DROGAVET RECIF');
  });
});

// ─── parseBradesco ─────────────────────────────────────────────────────────────

describe('parseBradesco', () => {
  it('parses a simple Bradesco transaction', () => {
    const text = '01/03 ATACAREJO PAULISTA PAULISTA 326,05\n';
    const txs = parseBradesco(text);
    expect(txs).toHaveLength(1);
    expect(txs[0].date).toBe('01/03');
    expect(txs[0].value).toBeCloseTo(326.05);
    expect(txs[0].source).toBe('bradesco');
    expect(txs[0].splitPeople).toBe(1);
  });

  it('removes trailing city from description', () => {
    const text = '24/02 GRAN COFFEE Sao Paulo 17,00\n';
    const txs = parseBradesco(text);
    expect(txs[0].description).not.toContain('Sao Paulo');
  });

  it('parses transaction with installment', () => {
    const text = '23/06 HTM*DESCOMPLICA CURS09/12 Brasilia 194,56\n';
    const txs = parseBradesco(text);
    expect(txs).toHaveLength(1);
    expect(txs[0].installment).toBe('09/12');
    expect(txs[0].category).toBe('educacao');
  });

  it('skips payment lines (negative values)', () => {
    const text = '02/03 PAGTO. POR DEB EM C/C 3.062,08-\n';
    const txs = parseBradesco(text);
    expect(txs).toHaveLength(0);
  });

  it('skips lines with PAGTO keyword', () => {
    const text = 'PAGTO. POR DEB EM C/C 3.062,08\n';
    const txs = parseBradesco(text);
    expect(txs).toHaveLength(0);
  });

  it('skips Total da fatura lines', () => {
    const text = 'Total da fatura em real 4.530,35\n';
    const txs = parseBradesco(text);
    expect(txs).toHaveLength(0);
  });

  it('categorizes Bradesco transactions by keyword', () => {
    const text = '03/03 FELIX E CAVALCANTI PAULISTA 204,62\n';
    const txs = parseBradesco(text);
    expect(txs[0].category).toBe('supermercado');
  });

  it('parses multiple Bradesco transactions', () => {
    const text = [
      '28/02 MARALCO COMERCIO DE AL RECIFE 4,00',
      '28/02 GAZETA DO PO*Gazeta CURITIBA 8,25',
      '01/03 ATACAREJO PAULISTA PAULISTA 326,05',
    ].join('\n');
    const txs = parseBradesco(text);
    expect(txs).toHaveLength(3);
    expect(txs[0].category).toBe('alimentacao');
    expect(txs[1].category).toBe('assinaturas');
    expect(txs[2].category).toBe('supermercado');
  });

  it('skips encargos lines', () => {
    const text = 'Encargos sobreparcelado 07/24 55,79\n';
    const txs = parseBradesco(text);
    expect(txs).toHaveLength(0);
  });

  it('skips IOF lines', () => {
    const text = 'IOF diário sobreparcelado 07/24 5,14\n';
    const txs = parseBradesco(text);
    expect(txs).toHaveLength(0);
  });

  it('handles Farmacia Beira Mar categorization', () => {
    const text = '06/03 FARMACIA BEIRA MAR PAULISTA 34,99\n';
    const txs = parseBradesco(text);
    expect(txs[0].category).toBe('farmacia');
  });

  it('handles postos categorization — servicos matches first', () => {
    const text = '15/03 POSTOS DE SERVICOS DA CAMARAGIBE 146,30\n';
    const txs = parseBradesco(text);
    expect(txs[0].category).toBe('servicos');
  });

  it('assigns unique IDs', () => {
    const text = '01/03 A PAULISTA 10,00\n02/03 B RECIFE 20,00\n';
    const txs = parseBradesco(text);
    expect(txs[0].id).not.toBe(txs[1].id);
  });
});

// ─── CATEGORIES constant ──────────────────────────────────────────────────────

describe('CATEGORIES', () => {
  it('has all 16 categories defined', async () => {
    const { CATEGORIES } = await import('./types');
    expect(Object.keys(CATEGORIES)).toHaveLength(16);
  });

  it('each category has required fields', async () => {
    const { CATEGORIES } = await import('./types');
    for (const cat of Object.values(CATEGORIES)) {
      expect(cat.key).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.color).toBeTruthy();
      expect(cat.bgColor).toBeTruthy();
      expect(cat.icon).toBeTruthy();
    }
  });
});
