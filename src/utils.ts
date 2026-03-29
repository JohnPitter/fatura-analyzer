import type { Transaction, Person } from './types';

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Maximum installment count (4 years) */
export const MAX_INSTALLMENTS = 48;

/**
 * Extract installment info (DD/DD) from a description string.
 * Returns the installment string and the cleaned description.
 */
export function extractInstallment(description: string): { installment?: string; cleaned: string } {
  let installment: string | undefined;
  const matches = [...description.matchAll(/(\d{2})\/(\d{2})/g)];
  for (const m of matches) {
    const num = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (num > 0 && total > 1 && num <= total && total <= MAX_INSTALLMENTS) {
      installment = `${m[1]}/${m[2]}`;
      break;
    }
  }
  let cleaned = description;
  if (installment) {
    cleaned = description.replace(new RegExp(`\\s*${installment.replace('/', '\\/')}\\s*`), ' ').trim();
  }
  return { installment, cleaned };
}

/**
 * Get the value a specific person owes for a transaction.
 */
export function getPersonValue(tx: Transaction, person: Person, people: Person[]): number {
  if (tx.assignedTo) {
    return person.id === tx.assignedTo ? tx.value : 0;
  }
  if (tx.splitPeople > 1) {
    const idx = people.indexOf(person);
    return idx < tx.splitPeople ? tx.value / tx.splitPeople : 0;
  }
  return people.indexOf(person) === 0 ? tx.value : 0;
}

/**
 * Filter transactions that belong to a specific person.
 */
export function getPersonTransactions(transactions: Transaction[], person: Person, people: Person[]): Transaction[] {
  const idx = people.indexOf(person);
  return transactions.filter(tx => {
    if (tx.assignedTo) return tx.assignedTo === person.id;
    if (tx.splitPeople > 1) return idx < tx.splitPeople;
    return idx === 0;
  });
}
