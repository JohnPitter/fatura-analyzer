<div align="center">

# Fatura Analyzer

**Analise faturas de cartao de credito direto no navegador — 100% local, nenhum dado armazenado.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-130%20passing-2D8E5E?style=flat-square)](https://vitest.dev)
[![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)](#license)

[Demo](https://johnpitter.github.io/fatura-analyzer/) · [Features](#-features) · [Como Funciona](#-como-funciona) · [Tech Stack](#-tech-stack) · [Desenvolvimento](#-desenvolvimento)


https://github.com/JohnPitter/fatura-analyzer/raw/main/assets/promo.mp4


</div>

---

## O que e o Fatura Analyzer?

Fatura Analyzer e uma aplicacao web que analisa faturas de cartao de credito em PDF dos bancos **Itau** e **Bradesco**. Faca upload dos PDFs, veja seus gastos organizados por categoria, divida despesas entre pessoas e tenha uma visao clara de para onde seu dinheiro vai.

**Nenhum dado sai do seu computador.** Os PDFs sao processados inteiramente no navegador via JavaScript. Ao recarregar a pagina, tudo desaparece.

---

## Features

| Categoria | O que voce ganha |
|---|---|
| **Upload de PDF** | Arraste ou selecione faturas do Itau e Bradesco — deteccao automatica do banco |
| **Categorizacao Automatica** | 16 categorias: Restaurante, Supermercado, Saude, Educacao, Tecnologia, Farmacia, Pet, etc. |
| **Dashboard Visual** | Cards de resumo, breakdown por categoria com barras proporcionais, filtros interativos |
| **Divisao de Gastos** | Adicione pessoas, divida transacoes individualmente ou em massa por categoria |
| **Totais por Pessoa** | Calculo automatico de quanto cada pessoa deve apos as divisoes |
| **Tabela Interativa** | Ordenacao por data/valor/categoria, troca de categoria inline, remocao de transacoes |
| **Divisao em Massa** | Divida todas as transacoes de uma categoria de uma vez (÷1, ÷2, ÷3, ÷4) |
| **Layout Full-Width** | Dashboard responsivo com painel lateral de categorias e tabela principal |
| **Animacoes** | Fade-in, scale-in, stagger, bar-grow, float — tudo com CSS puro |
| **Privacidade Total** | Zero servidores, zero cookies, zero rastreamento — processamento 100% local |
| **130+ Testes** | 102 unitarios (Vitest) + 28 E2E (Playwright) — todos passando |

---

## Como Funciona

```
                    ┌──────────────────────────┐
                    │     Upload PDF (drag/     │
                    │     drop ou selecionar)   │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   pdf.js extrai texto e   │
                    │   posicoes de cada item   │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
    ┌─────────▼──────┐  ┌───────▼────────┐  ┌──────▼──────────┐
    │ Detecta banco  │  │ Agrupa texto   │  │ Filtra ruido:   │
    │ (Itau/Bradesco)│  │ por coordenada │  │ limites, taxas, │
    │                │  │ Y → linhas     │  │ encargos, IOF   │
    └─────────┬──────┘  └───────┬────────┘  └──────┬──────────┘
              │                 │                   │
              └─────────────────┼───────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Parser especifico:   │
                    │  parseItau() ou       │
                    │  parseBradesco()      │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Categoriza cada      │
                    │  transacao (keyword   │
                    │  matching + Itau      │
                    │  explicit categories) │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Renderiza dashboard  │
                    │  com React            │
                    └───────────────────────┘
```

### Parsing Inteligente

O parser lida com as complexidades reais dos PDFs bancarios:

- **Itau**: Layout 2 colunas com categorias na linha seguinte, secao de internacionais separada, filtragem da secao "Compras parceladas - proximas faturas" (parcelas futuras nao sao gastos atuais)
- **Bradesco**: Layout 2 colunas com informacoes de limites/taxas no lado direito misturadas com transacoes, filtragem de encargos, IOF, tabelas de taxas

---

## Tech Stack

| Camada | Tecnologia |
|---|---|
| **Framework** | React 19 + TypeScript 5.9 |
| **Build** | Vite 8 |
| **Styling** | Tailwind CSS 4 |
| **PDF Parsing** | pdf.js (pdfjs-dist) |
| **Icons** | Lucide React |
| **Fonts** | DM Sans + DM Mono (Google Fonts) |
| **Unit Tests** | Vitest + Testing Library |
| **E2E Tests** | Playwright (Chromium) |
| **Deploy** | GitHub Pages (GitHub Actions) |

---

## Desenvolvimento

### Pre-requisitos

- Node.js 20+
- npm

### Setup

```bash
# Clone
git clone https://github.com/JohnPitter/fatura-analyzer.git
cd fatura-analyzer

# Instale dependencias
npm install

# Dev server
npm run dev

# Build
npm run build

# Testes unitarios
npm test

# Testes E2E (requer build)
npm run build && npm run test:e2e
```

### Estrutura

```
src/
  App.tsx          # Componente principal com dashboard full-width
  parser.ts        # Parsers para Itau e Bradesco (categorize, parseValue, etc.)
  types.ts         # Types e constantes de categorias
  index.css        # Tailwind + animacoes CSS customizadas
  parser.test.ts   # 71 testes unitarios do parser
  App.test.tsx     # 31 testes do componente App
e2e/
  app.spec.ts      # 28 testes E2E (Playwright)
  fixtures/        # PDFs de teste
```

---

## Privacidade

- Nenhum dado e enviado para servidores
- Nenhum cookie, nenhum rastreamento
- PDFs processados 100% no navegador (JavaScript)
- Ao fechar ou recarregar a pagina, todos os dados desaparecem
- Codigo fonte aberto para auditoria

---

## License

MIT License - use livremente.
