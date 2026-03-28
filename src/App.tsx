import { useState, useMemo, useCallback } from 'react';
import {
  Upload, FileText, Trash2, Users, ChevronDown, ChevronUp,
  PieChart, ArrowUpDown, X, UserPlus, Receipt,
  UtensilsCrossed, ChefHat, ShoppingCart, Heart, GraduationCap,
  Shirt, Car, Home, Gamepad2, Cpu, Wrench, Pill, PawPrint,
  RefreshCw, Landmark, Package, TrendingDown, Filter,
  ShieldCheck, Lock, Eye, EyeOff, Download, Building2, Search,
} from 'lucide-react';
import { parsePDF } from './parser';
import { exportExcel, exportPDF } from './export';
import type { Transaction, Category, Person } from './types';
import { CATEGORIES } from './types';

const ICON_MAP: Record<string, React.ElementType> = {
  UtensilsCrossed, ChefHat, ShoppingCart, Heart, GraduationCap,
  Shirt, Car, Home, Gamepad2, Cpu, Wrench, Pill, PawPrint,
  RefreshCw, Landmark, Package,
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type SortField = 'date' | 'description' | 'value' | 'category';
type SortDir = 'asc' | 'desc';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<Person[]>([
    { id: 'p-1', name: 'Eu' },
  ]);
  const [newPersonName, setNewPersonName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [showSplitPanel, setShowSplitPanel] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterBank, setFilterBank] = useState<'all' | 'itau' | 'bradesco'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignDropdownTx, setAssignDropdownTx] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(Array.from(files));
    e.target.value = '';
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    setIsLoading(true);
    const newTransactions: Transaction[] = [];
    const newFileNames: string[] = [];

    for (const file of files) {
      try {
        const txs = await parsePDF(file);
        newTransactions.push(...txs);
        newFileNames.push(file.name);
      } catch (err) {
        console.error(`Error parsing ${file.name}:`, err);
      }
    }

    setTransactions(prev => [...prev, ...newTransactions]);
    setUploadedFiles(prev => [...prev, ...newFileNames]);
    setIsLoading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const addPerson = useCallback(() => {
    if (!newPersonName.trim()) return;
    setPeople(prev => [...prev, { id: `p-${Date.now()}`, name: newPersonName.trim() }]);
    setNewPersonName('');
  }, [newPersonName]);

  const removePerson = useCallback((id: string) => {
    if (people.length <= 1) return;
    setPeople(prev => prev.filter(p => p.id !== id));
  }, [people.length]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'value' ? 'desc' : 'asc');
    }
  }, [sortField]);

  const filteredTransactions = useMemo(() => {
    let txs = [...transactions];
    if (filterCategory !== 'all') {
      txs = txs.filter(t => t.category === filterCategory);
    }
    if (filterBank !== 'all') {
      txs = txs.filter(t => t.source === filterBank);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      txs = txs.filter(t => t.description.toLowerCase().includes(q));
    }
    txs.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'description': cmp = a.description.localeCompare(b.description); break;
        case 'value': cmp = a.value - b.value; break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return txs;
  }, [transactions, filterCategory, filterBank, searchQuery, sortField, sortDir]);

  const categoryBreakdown = useMemo(() => {
    const myId = people[0]?.id;
    const map = new Map<Category, { total: number; count: number; personalTotal: number }>();
    for (const tx of transactions) {
      const existing = map.get(tx.category) ?? { total: 0, count: 0, personalTotal: 0 };
      existing.total += tx.value;
      existing.count += 1;
      if (tx.assignedTo) {
        existing.personalTotal += tx.assignedTo === myId ? tx.value : 0;
      } else {
        existing.personalTotal += tx.value / tx.splitPeople;
      }
      map.set(tx.category, existing);
    }
    return Array.from(map.entries())
      .map(([key, val]) => ({ category: key, ...val }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, people]);

  const totalGeral = useMemo(() => transactions.reduce((s, t) => s + t.value, 0), [transactions]);
  const totalPessoal = useMemo(() => {
    const myId = people[0]?.id;
    return transactions.reduce((s, t) => {
      if (t.assignedTo) {
        return s + (t.assignedTo === myId ? t.value : 0);
      }
      return s + t.value / t.splitPeople;
    }, 0);
  }, [transactions, people]);

  const personTotals = useMemo(() => {
    if (people.length <= 1) return [];
    const totals = people.map(p => ({ person: p, total: 0 }));
    const personIndexMap = new Map(people.map((p, i) => [p.id, i]));
    for (const tx of transactions) {
      if (tx.assignedTo) {
        const idx = personIndexMap.get(tx.assignedTo);
        if (idx !== undefined) {
          totals[idx].total += tx.value;
        }
      } else if (tx.splitPeople > 1) {
        const perPerson = tx.value / tx.splitPeople;
        totals[0].total += perPerson;
        const othersCount = tx.splitPeople - 1;
        for (let i = 1; i < people.length && i <= othersCount; i++) {
          totals[i].total += perPerson;
        }
      } else {
        totals[0].total += tx.value;
      }
    }
    return totals;
  }, [transactions, people]);

  const maxCategoryTotal = useMemo(() => {
    return categoryBreakdown.length > 0 ? categoryBreakdown[0].total : 1;
  }, [categoryBreakdown]);

  const bankBreakdown = useMemo(() => {
    const itauTxs = transactions.filter(t => t.source === 'itau');
    const bradescoTxs = transactions.filter(t => t.source === 'bradesco');
    return {
      itau: { count: itauTxs.length, total: itauTxs.reduce((s, t) => s + t.value, 0) },
      bradesco: { count: bradescoTxs.length, total: bradescoTxs.reduce((s, t) => s + t.value, 0) },
    };
  }, [transactions]);

  const getExportData = useCallback(() => ({
    transactions: filteredTransactions,
    people,
    totalGeral,
    totalPessoal,
    categoryBreakdown,
    bankBreakdown,
    personTotals,
  }), [filteredTransactions, people, totalGeral, totalPessoal, categoryBreakdown, bankBreakdown, personTotals]);

  const handleExportExcel = useCallback(() => {
    exportExcel(getExportData());
    setShowExportMenu(false);
  }, [getExportData]);

  const handleExportPDF = useCallback(() => {
    exportPDF(getExportData());
    setShowExportMenu(false);
  }, [getExportData]);

  const hasTransactions = transactions.length > 0;

  return (
    <div
      className="min-h-screen bg-sand-50"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-ember-500/10 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-3xl border-2 border-dashed border-ember-400 p-16 text-center animate-bounce-in">
            <Upload className="w-16 h-16 text-ember-500 mx-auto mb-4" />
            <p className="text-xl font-semibold text-ink-800">Solte seus PDFs aqui</p>
            <p className="text-[13px] text-ink-400 mt-1">Itau e Bradesco suportados</p>
          </div>
        </div>
      )}

      {/* Header — full width */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-sand-50/80 border-b border-sand-200 animate-fade-in-down">
        <div className="w-full px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink-900 flex items-center justify-center hover:rotate-6 transition-transform duration-300">
              <Receipt className="w-5 h-5 text-sand-100" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-ink-900 leading-none">
                Fatura Analyzer
              </h1>
              <p className="text-[11px] text-ink-400 tracking-wider uppercase mt-0.5">
                Analise seus gastos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Privacy Toggle */}
            <button
              onClick={() => setShowPrivacy(!showPrivacy)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-jade-500 bg-jade-100 hover:bg-jade-200 transition-all duration-200 cursor-pointer"
            >
              <div className="relative">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-jade-400 rounded-full privacy-dot" />
              </div>
              Privacidade
            </button>
            {hasTransactions && (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                      showExportMenu ? 'bg-ink-900 text-sand-100' : 'bg-sand-200 text-ink-700 hover:bg-sand-300'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border-2 border-sand-200 shadow-2xl p-1.5 w-44 animate-scale-in">
                      <button
                        onClick={handleExportExcel}
                        className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-ink-700 hover:bg-jade-100 hover:text-jade-600 transition-all duration-150 cursor-pointer flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Excel (.xlsx)
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-ink-700 hover:bg-ruby-100 hover:text-ruby-600 transition-all duration-150 cursor-pointer flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        PDF (.pdf)
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowSplitPanel(!showSplitPanel)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                    showSplitPanel
                      ? 'bg-ink-900 text-sand-100 shadow-lg shadow-ink-900/20'
                      : 'bg-sand-200 text-ink-700 hover:bg-sand-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Dividir gastos
                </button>
              </>
            )}
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember-500 text-white text-[13px] font-medium hover:bg-ember-400 hover:shadow-xl hover:shadow-ember-500/30 transition-all duration-200 cursor-pointer active:scale-[0.97]  shadow-lg shadow-ember-500/20">
              <Upload className="w-4 h-4" />
              {isLoading ? 'Processando...' : 'Upload PDF'}
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>
        </div>
      </header>

      {/* Privacy Banner — full width */}
      {showPrivacy && (
        <div className="bg-jade-100 border-b border-jade-200 animate-fade-in-down">
          <div className="w-full px-8 py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-jade-500 flex items-center justify-center shrink-0 animate-bounce-in">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-[14px] font-semibold text-jade-500 mb-1">Seus dados estao 100% seguros</h3>
                <div className="space-y-1.5 text-[13px] text-ink-600">
                  <p className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-jade-500 shrink-0" />
                    <strong>Nenhum dado e armazenado.</strong> Seus PDFs sao processados inteiramente no seu navegador.
                  </p>
                  <p className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-jade-500 shrink-0" />
                    Nenhuma informacao financeira e enviada para servidores externos.
                  </p>
                  <p className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-jade-500 shrink-0" />
                    Ao fechar ou recarregar a pagina, todos os dados sao apagados da memoria.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPrivacy(false)} className="p-1 rounded-md hover:bg-jade-200 transition-colors cursor-pointer">
                <X className="w-4 h-4 text-jade-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="w-full px-8 py-8">
        {/* Empty State */}
        {!hasTransactions && !isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-24 h-24 rounded-3xl bg-sand-200 flex items-center justify-center mb-6 animate-float">
              <FileText className="w-12 h-12 text-sand-400" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink-800 mb-2 animate-fade-in-up">
              Nenhuma fatura carregada
            </h2>
            <p className="text-ink-400 text-[15px] mb-8 max-w-md text-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Envie suas faturas do Itau ou Bradesco em PDF para analisar seus gastos por categoria, dividir entre pessoas e muito mais.
            </p>
            <label className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-ink-900 text-sand-100 text-[15px] font-medium hover:bg-ink-800 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer active:scale-[0.98] shadow-xl shadow-ink-900/30 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <Upload className="w-5 h-5" />
              Selecionar faturas PDF
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isLoading}
              />
            </label>
            <p className="text-[11px] text-ink-300 mt-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              ou arraste e solte seus PDFs em qualquer lugar da pagina
            </p>

            {/* Privacy note in empty state */}
            <div className="mt-12 flex items-center gap-2 px-4 py-2 rounded-full bg-jade-100 text-jade-500 text-[12px] font-medium animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <ShieldCheck className="w-3.5 h-3.5" />
              Nenhum dado e armazenado — tudo roda no seu navegador
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-ember-100 flex items-center justify-center animate-bounce-in">
                <FileText className="w-10 h-10 text-ember-500" />
              </div>
              <div className="absolute inset-0 rounded-2xl border-2 border-ember-300 animate-ping opacity-30" />
            </div>
            <p className="text-ink-500 text-[15px] mt-6 animate-shimmer">Processando faturas...</p>
            <div className="w-48 h-1 bg-sand-200 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-ember-500 rounded-full animate-[grow-width_2s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {hasTransactions && (
          <div className="space-y-8">
            {/* Uploaded Files */}
            <div className="flex flex-wrap gap-2 animate-fade-in-up">
              {uploadedFiles.map((name, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sand-200 text-ink-600 text-[12px] font-medium animate-scale-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <FileText className="w-3 h-3" />
                  {name}
                </span>
              ))}
            </div>

            {/* Summary Cards — full width, 4 across */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {[
                {
                  label: 'Total da Fatura',
                  value: formatBRL(totalGeral),
                  sub: `${transactions.length} transacoes`,
                  color: 'text-ink-900',
                  delay: '0.05s',
                },
                {
                  label: 'Meu Total (pessoal)',
                  value: formatBRL(totalPessoal),
                  sub: `${totalGeral > 0 ? ((1 - totalPessoal / totalGeral) * 100).toFixed(0) : 0}% dividido`,
                  color: 'text-ember-500',
                  delay: '0.1s',
                  icon: TrendingDown,
                },
                {
                  label: 'Categorias',
                  value: String(categoryBreakdown.length),
                  sub: `Maior: ${categoryBreakdown.length > 0 ? CATEGORIES[categoryBreakdown[0].category].label : '-'}`,
                  color: 'text-ink-900',
                  delay: '0.15s',
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-sand-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-sand-300 hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: card.delay }}
                >
                  <p className="text-[11px] text-ink-400 uppercase tracking-wider font-medium">{card.label}</p>
                  <p className={`text-[28px] font-bold tracking-tight ${card.color} mt-1 font-mono animate-count-up`}>
                    {card.value}
                  </p>
                  <p className="text-[12px] text-ink-400 mt-1">
                    {card.icon && <card.icon className="w-3 h-3 inline mr-1" />}
                    {card.sub}
                  </p>
                </div>
              ))}

              {/* Bank Breakdown Card */}
              <div className="rounded-xl border border-sand-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-sand-300 hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <p className="text-[11px] text-ink-400 uppercase tracking-wider font-medium mb-3">
                  <Building2 className="w-3 h-3 inline mr-1" />
                  Por Banco
                </p>
                <div className="flex gap-2">
                  {([['all', 'Todos'] as const, ['itau', 'Itau'] as const, ['bradesco', 'Bradesco'] as const]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setFilterBank(key)}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                        filterBank === key
                          ? 'bg-ink-900 text-sand-100 shadow-sm'
                          : 'bg-sand-100 text-ink-500 hover:bg-sand-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-3 text-[11px]">
                  {bankBreakdown.itau.count > 0 && (
                    <span className={`${filterBank === 'itau' ? 'text-ember-500 font-semibold' : 'text-ink-400'}`}>
                      Itau: {formatBRL(bankBreakdown.itau.total)} ({bankBreakdown.itau.count}x)
                    </span>
                  )}
                  {bankBreakdown.bradesco.count > 0 && (
                    <span className={`${filterBank === 'bradesco' ? 'text-ruby-500 font-semibold' : 'text-ink-400'}`}>
                      Bradesco: {formatBRL(bankBreakdown.bradesco.total)} ({bankBreakdown.bradesco.count}x)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Split Panel — full width above the 2-col layout */}
            {showSplitPanel && (
              <div className="rounded-xl border border-sand-200 bg-white p-6 shadow-sm animate-fade-in-down">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-ink-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-ink-500" />
                    Gerenciar Pessoas
                  </h3>
                  <button onClick={() => setShowSplitPanel(false)} className="p-1 rounded-md hover:bg-sand-100 transition-colors cursor-pointer">
                    <X className="w-4 h-4 text-ink-400" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {people.map((p, i) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sand-100 border border-sand-200 text-[13px] font-medium text-ink-700 animate-scale-in"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      {p.name}
                      {people.length > 1 && (
                        <button onClick={() => removePerson(p.id)} className="hover:text-ruby-500 transition-colors cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPersonName}
                    onChange={e => setNewPersonName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addPerson()}
                    placeholder="Nome da pessoa..."
                    className="flex-1 px-3 py-2 rounded-lg border border-sand-200 bg-sand-50 text-[13px] text-ink-800 placeholder:text-ink-300 outline-none focus:border-ember-300 focus:ring-2 focus:ring-ember-200 transition-all duration-200"
                  />
                  <button
                    onClick={addPerson}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink-900 text-sand-100 text-[13px] font-medium hover:bg-ink-800 transition-all duration-200 cursor-pointer active:scale-[0.97]"
                  >
                    <UserPlus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                {/* Person Totals */}
                {personTotals.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-sand-200 animate-fade-in-up">
                    <h4 className="text-[12px] text-ink-400 uppercase tracking-wider font-medium mb-3">Total por pessoa</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {personTotals.map(({ person, total }, i) => (
                        <div
                          key={person.id}
                          className="rounded-xl bg-sand-50 border border-sand-200 p-3 hover:border-sand-300 hover:shadow-sm transition-all duration-200 animate-scale-in"
                          style={{ animationDelay: `${i * 0.05}s` }}
                        >
                          <p className="text-[12px] text-ink-400 font-medium">{person.name}</p>
                          <p className="text-[18px] font-bold text-ink-900 font-mono mt-0.5">
                            {formatBRL(total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2-Column Dashboard Layout */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Panel — Category Breakdown (sticky) */}
              <div className="w-full lg:w-[380px] shrink-0">
                <div className="lg:sticky lg:top-20">
                  <div className="rounded-xl border border-sand-200 bg-white p-6 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-[15px] font-semibold text-ink-800 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-ink-500" />
                        Gastos por Categoria
                      </h3>
                      {filterCategory !== 'all' && (
                        <button
                          onClick={() => setFilterCategory('all')}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-ember-100 text-ember-500 text-[11px] font-medium hover:bg-ember-200 transition-all duration-200 cursor-pointer animate-scale-in"
                        >
                          Limpar
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {categoryBreakdown.map(({ category, total, count, personalTotal }, idx) => {
                        const info = CATEGORIES[category];
                        const IconComp = ICON_MAP[info.icon] ?? Package;
                        const pct = maxCategoryTotal > 0 ? (total / maxCategoryTotal) * 100 : 0;

                        return (
                          <button
                            key={category}
                            onClick={() => setFilterCategory(filterCategory === category ? 'all' : category)}
                            className={`w-full text-left group cursor-pointer rounded-xl p-3 transition-all duration-200 hover:scale-[1.005] animate-fade-in-up ${
                              filterCategory === category
                                ? 'bg-ink-900 text-sand-100 shadow-lg shadow-ink-900/10'
                                : 'hover:bg-sand-50'
                            }`}
                            style={{ animationDelay: `${0.25 + idx * 0.04}s` }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
                                  filterCategory === category ? 'bg-sand-100/10' : info.bgColor
                                }`}>
                                  <IconComp className={`w-3.5 h-3.5 ${
                                    filterCategory === category ? 'text-sand-100' : info.color
                                  }`} />
                                </div>
                                <span className={`text-[13px] font-medium ${
                                  filterCategory === category ? 'text-sand-100' : 'text-ink-700'
                                }`}>
                                  {info.label}
                                </span>
                                <span className={`text-[11px] ${
                                  filterCategory === category ? 'text-sand-300' : 'text-ink-400'
                                }`}>
                                  {count}x
                                </span>
                              </div>
                              <div className="text-right">
                                <span className={`text-[14px] font-bold font-mono ${
                                  filterCategory === category ? 'text-sand-100' : 'text-ink-800'
                                }`}>
                                  {formatBRL(total)}
                                </span>
                                {personalTotal < total && (
                                  <span className={`text-[11px] block ${
                                    filterCategory === category ? 'text-sand-300' : 'text-ink-400'
                                  }`}>
                                    pessoal: {formatBRL(personalTotal)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${
                              filterCategory === category ? 'bg-sand-100/10' : 'bg-sand-100'
                            }`}>
                              <div
                                className={`h-full rounded-full bar-grow ${
                                  filterCategory === category ? 'bg-ember-400' : 'bg-ember-500/60'
                                }`}
                                style={{ width: `${pct}%`, animationDelay: `${0.4 + idx * 0.06}s` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel — Transactions + Bulk Split */}
              <div className="flex-1 min-w-0 space-y-6">
                {/* Transactions Table */}
                <div className="rounded-xl border border-sand-200 bg-white shadow-sm animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <div className="px-6 py-4 border-b border-sand-200 flex items-center justify-between gap-4">
                    <h3 className="text-[15px] font-semibold text-ink-800 flex items-center gap-2 shrink-0">
                      <Receipt className="w-4 h-4 text-ink-500" />
                      Transacoes
                      <span className="text-[12px] font-normal text-ink-400">
                        ({filteredTransactions.length})
                      </span>
                    </h3>
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar descricao..."
                        className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-sand-200 bg-sand-50 text-[12px] text-ink-800 placeholder:text-ink-300 outline-none focus:border-ember-300 focus:ring-2 focus:ring-ember-200 transition-all duration-200"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500 cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {filterBank !== 'all' && (
                        <button
                          onClick={() => setFilterBank('all')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80 transition-all duration-200 cursor-pointer animate-scale-in ${
                            filterBank === 'itau' ? 'bg-ember-100 text-ember-500' : 'bg-ruby-100 text-ruby-500'
                          }`}
                        >
                          <Building2 className="w-3 h-3" />
                          {filterBank === 'itau' ? 'Itau' : 'Bradesco'}
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {filterCategory !== 'all' && (
                        <button
                          onClick={() => setFilterCategory('all')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ember-100 text-ember-500 text-[12px] font-medium hover:bg-ember-200 transition-all duration-200 cursor-pointer animate-scale-in"
                        >
                          <Filter className="w-3 h-3" />
                          {CATEGORIES[filterCategory].label}
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-sand-200 bg-sand-50/50">
                          {[
                            { key: 'date' as SortField, label: 'Data', w: 'w-20' },
                            { key: 'description' as SortField, label: 'Descricao', w: '' },
                            { key: 'category' as SortField, label: 'Categoria', w: 'w-36' },
                            { key: 'value' as SortField, label: 'Valor', w: 'w-32' },
                          ].map(col => (
                            <th
                              key={col.key}
                              className={`px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider cursor-pointer hover:text-ink-600 transition-colors ${col.w}`}
                              onClick={() => toggleSort(col.key)}
                            >
                              <span className="flex items-center gap-1">
                                {col.label}
                                <ArrowUpDown className={`w-3 h-3 transition-transform duration-200 ${sortField === col.key ? 'text-ember-500 scale-110' : ''}`} />
                              </span>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider w-28">
                            Dividir
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((tx, idx) => {
                          const catInfo = CATEGORIES[tx.category];
                          const IconComp = ICON_MAP[catInfo.icon] ?? Package;
                          const isExpanded = expandedTx === tx.id;

                          return (
                            <tr
                              key={tx.id}
                              className="border-b border-sand-100 hover:bg-sand-50/80 transition-all duration-150 group row-enter"
                              style={{ animationDelay: `${Math.min(idx * 0.02, 0.5)}s` }}
                            >
                              <td className="px-4 py-3 text-[13px] text-ink-500 font-mono">
                                {tx.date}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] text-ink-800 font-medium">
                                    {tx.description}
                                  </span>
                                  {tx.installment && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-500 font-mono font-medium">
                                      {tx.installment}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    tx.source === 'itau' ? 'bg-ember-100 text-ember-500' : 'bg-ruby-100 text-ruby-500'
                                  }`}>
                                    {tx.source === 'itau' ? 'Itau' : 'Bradesco'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 relative">
                                <button
                                  onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                                  className="cursor-pointer"
                                >
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-200 hover:shadow-sm ${catInfo.bgColor} ${catInfo.color}`}>
                                    <IconComp className="w-3 h-3" />
                                    {catInfo.label}
                                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                  </span>
                                </button>
                                {isExpanded && (
                                  <div className="absolute z-20 mt-1 bg-white rounded-xl border border-sand-200 shadow-xl p-2 grid grid-cols-2 gap-1 w-72 animate-scale-in">
                                    {Object.values(CATEGORIES).map(cat => {
                                      const CatIcon = ICON_MAP[cat.icon] ?? Package;
                                      return (
                                        <button
                                          key={cat.key}
                                          onClick={() => {
                                            updateTransaction(tx.id, { category: cat.key });
                                            setExpandedTx(null);
                                          }}
                                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 cursor-pointer hover:scale-[1.02] ${
                                            tx.category === cat.key
                                              ? 'bg-ink-900 text-sand-100'
                                              : 'hover:bg-sand-100 text-ink-600'
                                          }`}
                                        >
                                          <CatIcon className="w-3 h-3" />
                                          {cat.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <span className={`text-[14px] font-bold font-mono ${tx.assignedTo && tx.assignedTo !== people[0]?.id ? 'text-ink-400 line-through' : 'text-ink-900'}`}>
                                    {formatBRL(tx.value)}
                                  </span>
                                  {!tx.assignedTo && tx.splitPeople > 1 && (
                                    <span className="block text-[11px] text-jade-500 font-mono animate-fade-in">
                                      ÷{tx.splitPeople} = {formatBRL(tx.value / tx.splitPeople)}
                                    </span>
                                  )}
                                  {tx.assignedTo && tx.assignedTo !== people[0]?.id && (
                                    <span className="block text-[11px] text-plum-500 font-mono animate-fade-in">
                                      nao meu
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {tx.assignedTo ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-plum-100 text-plum-500 font-medium truncate max-w-[80px]">
                                      {people.find(p => p.id === tx.assignedTo)?.name ?? '?'}
                                    </span>
                                    <button
                                      onClick={() => updateTransaction(tx.id, { assignedTo: undefined })}
                                      className="w-5 h-5 rounded flex items-center justify-center text-ink-300 hover:bg-ruby-100 hover:text-ruby-500 transition-all duration-150 cursor-pointer active:scale-90"
                                      title="Remover atribuicao"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => updateTransaction(tx.id, {
                                        splitPeople: Math.max(1, tx.splitPeople - 1)
                                      })}
                                      disabled={tx.splitPeople <= 1}
                                      className="w-6 h-6 rounded flex items-center justify-center text-ink-400 hover:bg-sand-200 hover:text-ink-600 transition-all duration-150 disabled:opacity-30 cursor-pointer disabled:cursor-default active:scale-90"
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                    <span className={`text-[13px] font-mono font-medium w-8 text-center transition-colors duration-200 ${tx.splitPeople > 1 ? 'text-jade-500' : 'text-ink-700'}`}>
                                      {tx.splitPeople}
                                    </span>
                                    <button
                                      onClick={() => updateTransaction(tx.id, {
                                        splitPeople: tx.splitPeople + 1
                                      })}
                                      className="w-6 h-6 rounded flex items-center justify-center text-ink-400 hover:bg-sand-200 hover:text-ink-600 transition-all duration-150 cursor-pointer active:scale-90"
                                    >
                                      <ChevronUp className="w-3 h-3" />
                                    </button>
                                    {people.length > 1 && (
                                      <div className="relative ml-1">
                                        <button
                                          onClick={() => setAssignDropdownTx(assignDropdownTx === tx.id ? null : tx.id)}
                                          className={`w-6 h-6 rounded flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 ${
                                            assignDropdownTx === tx.id
                                              ? 'bg-plum-100 text-plum-500'
                                              : 'text-ink-300 hover:bg-plum-100 hover:text-plum-500'
                                          }`}
                                          title="Atribuir a uma pessoa"
                                        >
                                          <UserPlus className="w-3 h-3" />
                                        </button>
                                        {assignDropdownTx === tx.id && (
                                          <div className="absolute right-0 bottom-full mb-1 z-50 bg-white rounded-xl border-2 border-plum-200 shadow-2xl shadow-plum-500/20 p-1.5 w-40 animate-scale-in">
                                            <p className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold px-2 py-1">Atribuir a</p>
                                            {people.map(p => (
                                              <button
                                                key={p.id}
                                                onClick={() => {
                                                  updateTransaction(tx.id, { assignedTo: p.id, splitPeople: 1 });
                                                  setAssignDropdownTx(null);
                                                }}
                                                className="w-full text-left px-2.5 py-2 rounded-lg text-[13px] font-medium text-ink-700 hover:bg-plum-100 hover:text-plum-600 transition-all duration-150 cursor-pointer truncate"
                                              >
                                                {p.name}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => removeTransaction(tx.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-ruby-100 text-ink-300 hover:text-ruby-500 transition-all duration-200 cursor-pointer active:scale-90"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bulk Split */}
                <div className="rounded-xl border border-sand-200 bg-white p-6 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
                  <h3 className="text-[15px] font-semibold text-ink-800 flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-ink-500" />
                    Dividir em massa
                  </h3>
                  <p className="text-[13px] text-ink-400 mb-4">
                    Selecione quantas pessoas para dividir todas as transacoes de uma categoria.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {categoryBreakdown.map(({ category, count }, idx) => {
                      const info = CATEGORIES[category];
                      const IconComp = ICON_MAP[info.icon] ?? Package;
                      return (
                        <div
                          key={category}
                          className="rounded-xl border border-sand-200 p-3 hover:border-sand-300 hover:shadow-sm transition-all duration-200 animate-scale-in"
                          style={{ animationDelay: `${0.4 + idx * 0.03}s` }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <IconComp className={`w-3.5 h-3.5 ${info.color}`} />
                            <span className="text-[12px] font-medium text-ink-700">{info.label}</span>
                            <span className="text-[10px] text-ink-400">{count}x</span>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(n => (
                              <button
                                key={n}
                                onClick={() => {
                                  setTransactions(prev => prev.map(t =>
                                    t.category === category ? { ...t, splitPeople: n } : t
                                  ));
                                }}
                                className={`flex-1 py-1 rounded text-[12px] font-mono font-medium transition-all duration-200 cursor-pointer active:scale-95 ${
                                  transactions.some(t => t.category === category && t.splitPeople === n)
                                    ? 'bg-ink-900 text-sand-100 shadow-sm'
                                    : 'bg-sand-100 text-ink-500 hover:bg-sand-200'
                                }`}
                              >
                                ÷{n}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer — full width */}
      <footer className="border-t border-sand-200 mt-16">
        <div className="w-full px-8 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-jade-500" />
            <p className="text-[13px] font-medium text-ink-600">
              Nenhum dado e armazenado ou enviado para servidores
            </p>
          </div>
          <p className="text-[12px] text-ink-400 max-w-lg mx-auto leading-relaxed">
            Seus PDFs sao processados 100% no navegador usando JavaScript. Nenhuma informacao financeira sai do seu computador. Ao recarregar a pagina, todos os dados desaparecem.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="flex items-center gap-1.5 text-[11px] text-ink-300">
              <Lock className="w-3 h-3" /> Processamento local
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-300">
              <EyeOff className="w-3 h-3" /> Zero rastreamento
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-300">
              <ShieldCheck className="w-3 h-3" /> Sem cookies
            </span>
          </div>
          <p className="text-[11px] text-ink-300 mt-6">
            Fatura Analyzer &middot; Open source
          </p>
        </div>
      </footer>
    </div>
  );
}
