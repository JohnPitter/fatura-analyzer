import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction, Person, Category } from './types';
import { CATEGORIES } from './types';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface ExportData {
  transactions: Transaction[];
  people: Person[];
  totalGeral: number;
  totalPessoal: number;
  categoryBreakdown: { category: Category; total: number; count: number; personalTotal: number }[];
  bankBreakdown: { itau: { count: number; total: number }; bradesco: { count: number; total: number } };
  personTotals: { person: Person; total: number }[];
}

function buildPersonColumns(tx: Transaction, people: Person[]): Record<string, number> {
  const result: Record<string, number> = {};
  if (tx.assignedTo) {
    for (const p of people) {
      result[p.name] = p.id === tx.assignedTo ? tx.value : 0;
    }
  } else if (tx.splitPeople > 1) {
    const perPerson = tx.value / tx.splitPeople;
    for (let i = 0; i < people.length; i++) {
      result[people[i].name] = i < tx.splitPeople ? perPerson : 0;
    }
  } else {
    for (let i = 0; i < people.length; i++) {
      result[people[i].name] = i === 0 ? tx.value : 0;
    }
  }
  return result;
}

export function exportExcel(data: ExportData): void {
  const wb = XLSX.utils.book_new();
  const hasPeople = data.people.length > 1;

  // Sheet 1: Transacoes
  const txHeaders = ['Data', 'Descricao', 'Categoria', 'Banco', 'Parcela', 'Valor'];
  if (hasPeople) {
    txHeaders.push('Atribuido A', 'Dividido Por');
    for (const p of data.people) {
      txHeaders.push(p.name);
    }
  }

  const txRows = data.transactions.map(tx => {
    const row: (string | number)[] = [
      tx.date,
      tx.description,
      CATEGORIES[tx.category].label,
      tx.source === 'itau' ? 'Itau' : 'Bradesco',
      tx.installment ?? '-',
      tx.value,
    ];
    if (hasPeople) {
      const assignedName = tx.assignedTo ? (data.people.find(p => p.id === tx.assignedTo)?.name ?? '-') : '-';
      row.push(assignedName, tx.splitPeople);
      const cols = buildPersonColumns(tx, data.people);
      for (const p of data.people) {
        row.push(Math.round(cols[p.name] * 100) / 100);
      }
    }
    return row;
  });

  const ws1 = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);

  // Set column widths
  ws1['!cols'] = [
    { wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 12 },
    ...(hasPeople ? [{ wch: 14 }, { wch: 10 }, ...data.people.map(() => ({ wch: 14 }))] : []),
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Transacoes');

  // Sheet 2: Resumo
  const summaryRows: (string | number)[][] = [
    ['RESUMO GERAL'],
    ['Total da Fatura', data.totalGeral],
    ['Total Pessoal', data.totalPessoal],
    ['Transacoes', data.transactions.length],
    [],
    ['POR CATEGORIA'],
    ['Categoria', 'Total', 'Qtd', 'Pessoal'],
    ...data.categoryBreakdown.map(c => [
      CATEGORIES[c.category].label, c.total, c.count, c.personalTotal,
    ]),
    [],
    ['POR BANCO'],
    ['Banco', 'Total', 'Qtd'],
    ['Itau', data.bankBreakdown.itau.total, data.bankBreakdown.itau.count],
    ['Bradesco', data.bankBreakdown.bradesco.total, data.bankBreakdown.bradesco.count],
  ];

  if (hasPeople && data.personTotals.length > 0) {
    summaryRows.push([], ['POR PESSOA'], ['Pessoa', 'Total']);
    for (const pt of data.personTotals) {
      summaryRows.push([pt.person.name, pt.total]);
    }
  }

  const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws2['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 8 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');

  // Sheet 3: Por Pessoa (if people exist)
  if (hasPeople) {
    for (const person of data.people) {
      const personTxs = data.transactions.filter(tx => {
        if (tx.assignedTo) return tx.assignedTo === person.id;
        if (tx.splitPeople > 1) {
          const idx = data.people.indexOf(person);
          return idx < tx.splitPeople;
        }
        return data.people.indexOf(person) === 0;
      });

      const personRows = personTxs.map(tx => {
        const cols = buildPersonColumns(tx, data.people);
        return [
          tx.date,
          tx.description,
          CATEGORIES[tx.category].label,
          tx.source === 'itau' ? 'Itau' : 'Bradesco',
          tx.value,
          Math.round(cols[person.name] * 100) / 100,
        ];
      });

      const personTotal = personRows.reduce((s, r) => s + (r[5] as number), 0);
      const wsP = XLSX.utils.aoa_to_sheet([
        [`Transacoes de ${person.name}`],
        [`Total: ${formatBRL(personTotal)}`],
        [],
        ['Data', 'Descricao', 'Categoria', 'Banco', 'Valor Total', `Valor ${person.name}`],
        ...personRows,
      ]);
      wsP['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 14 }];

      const sheetName = person.name.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, wsP, sheetName);
    }
  }

  const fileName = `fatura-analyzer-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportPDF(data: ExportData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const hasPeople = data.people.length > 1;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Fatura Analyzer - Relatorio', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 24);

  // Summary box
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const summaryY = 32;
  doc.text(`Total da Fatura: ${formatBRL(data.totalGeral)}`, 14, summaryY);
  doc.text(`Total Pessoal: ${formatBRL(data.totalPessoal)}`, 100, summaryY);
  doc.text(`${data.transactions.length} transacoes`, 200, summaryY);

  // Bank breakdown
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (data.bankBreakdown.itau.count > 0) {
    doc.text(`Itau: ${formatBRL(data.bankBreakdown.itau.total)} (${data.bankBreakdown.itau.count}x)`, 14, summaryY + 6);
  }
  if (data.bankBreakdown.bradesco.count > 0) {
    doc.text(`Bradesco: ${formatBRL(data.bankBreakdown.bradesco.total)} (${data.bankBreakdown.bradesco.count}x)`, 100, summaryY + 6);
  }

  // Person totals
  if (hasPeople && data.personTotals.length > 0) {
    let px = 14;
    doc.setFont('helvetica', 'bold');
    doc.text('Por Pessoa:', px, summaryY + 12);
    doc.setFont('helvetica', 'normal');
    px = 50;
    for (const pt of data.personTotals) {
      doc.text(`${pt.person.name}: ${formatBRL(pt.total)}`, px, summaryY + 12);
      px += 60;
    }
  }

  // Transactions table
  const tableStartY = hasPeople ? summaryY + 18 : summaryY + 12;

  const txHead = ['Data', 'Descricao', 'Categoria', 'Banco', 'Valor'];
  if (hasPeople) {
    txHead.push('Atrib.');
    for (const p of data.people) {
      txHead.push(p.name);
    }
  }

  const txBody = data.transactions.map(tx => {
    const row: string[] = [
      tx.date,
      tx.description.substring(0, 30),
      CATEGORIES[tx.category].label,
      tx.source === 'itau' ? 'Itau' : 'Bradesco',
      formatBRL(tx.value),
    ];
    if (hasPeople) {
      const assignedName = tx.assignedTo ? (data.people.find(p => p.id === tx.assignedTo)?.name ?? '-') : tx.splitPeople > 1 ? `÷${tx.splitPeople}` : '-';
      row.push(assignedName);
      const cols = buildPersonColumns(tx, data.people);
      for (const p of data.people) {
        row.push(cols[p.name] > 0 ? formatBRL(cols[p.name]) : '-');
      }
    }
    return row;
  });

  autoTable(doc, {
    head: [txHead],
    body: txBody,
    startY: tableStartY,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [26, 22, 18], fontSize: 7 },
    alternateRowStyles: { fillColor: [251, 248, 241] },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 45 },
      4: { halign: 'right' },
    },
  });

  // Category breakdown on new page
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Gastos por Categoria', 14, 18);

  autoTable(doc, {
    head: [['Categoria', 'Total', 'Qtd', 'Pessoal']],
    body: data.categoryBreakdown.map(c => [
      CATEGORIES[c.category].label,
      formatBRL(c.total),
      String(c.count),
      formatBRL(c.personalTotal),
    ]),
    startY: 24,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [232, 98, 44] },
    columnStyles: {
      1: { halign: 'right' },
      3: { halign: 'right' },
    },
  });

  // Per-person pages
  if (hasPeople) {
    for (const person of data.people) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Transacoes - ${person.name}`, 14, 18);

      const personTxs = data.transactions.filter(tx => {
        if (tx.assignedTo) return tx.assignedTo === person.id;
        if (tx.splitPeople > 1) {
          const idx = data.people.indexOf(person);
          return idx < tx.splitPeople;
        }
        return data.people.indexOf(person) === 0;
      });

      const personBody = personTxs.map(tx => {
        const cols = buildPersonColumns(tx, data.people);
        return [
          tx.date,
          tx.description.substring(0, 35),
          CATEGORIES[tx.category].label,
          formatBRL(tx.value),
          formatBRL(cols[person.name]),
        ];
      });

      const personTotal = personTxs.reduce((s, tx) => {
        const cols = buildPersonColumns(tx, data.people);
        return s + cols[person.name];
      }, 0);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total: ${formatBRL(personTotal)}`, 14, 24);

      autoTable(doc, {
        head: [['Data', 'Descricao', 'Categoria', 'Valor Total', `Valor ${person.name}`]],
        body: personBody,
        startY: 30,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [126, 68, 168] },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
      });
    }
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Fatura Analyzer - Nenhum dado armazenado', 14, doc.internal.pageSize.height - 5);
    doc.text(`Pagina ${i}/${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 5);
    doc.setTextColor(0);
  }

  const fileName = `fatura-analyzer-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
