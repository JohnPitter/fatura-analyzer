export type Category =
  | 'alimentacao'
  | 'restaurante'
  | 'supermercado'
  | 'saude'
  | 'educacao'
  | 'vestuario'
  | 'transporte'
  | 'moradia'
  | 'entretenimento'
  | 'tecnologia'
  | 'servicos'
  | 'farmacia'
  | 'pet'
  | 'assinaturas'
  | 'financeiro'
  | 'outros';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  value: number;
  category: Category;
  source: 'itau' | 'bradesco';
  installment?: string;
  splitPeople: number;
  isPersonal: boolean;
  /** When set, the full value is assigned to this person only (not split). */
  assignedTo?: string;
  /** Free-text user note for the transaction (e.g., "cafe", "presente mae"). */
  note?: string;
}

export interface CategoryInfo {
  key: Category;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const CATEGORIES: Record<Category, CategoryInfo> = {
  alimentacao: { key: 'alimentacao', label: 'Alimentacao', color: 'text-ember-500', bgColor: 'bg-ember-100', icon: 'UtensilsCrossed' },
  restaurante: { key: 'restaurante', label: 'Restaurante', color: 'text-ember-400', bgColor: 'bg-ember-100', icon: 'ChefHat' },
  supermercado: { key: 'supermercado', label: 'Supermercado', color: 'text-jade-500', bgColor: 'bg-jade-100', icon: 'ShoppingCart' },
  saude: { key: 'saude', label: 'Saude', color: 'text-ruby-500', bgColor: 'bg-ruby-100', icon: 'Heart' },
  educacao: { key: 'educacao', label: 'Educacao', color: 'text-sky-500', bgColor: 'bg-sky-100', icon: 'GraduationCap' },
  vestuario: { key: 'vestuario', label: 'Vestuario', color: 'text-plum-500', bgColor: 'bg-plum-100', icon: 'Shirt' },
  transporte: { key: 'transporte', label: 'Transporte', color: 'text-ink-600', bgColor: 'bg-sand-200', icon: 'Car' },
  moradia: { key: 'moradia', label: 'Moradia', color: 'text-gold-500', bgColor: 'bg-gold-100', icon: 'Home' },
  entretenimento: { key: 'entretenimento', label: 'Entretenimento', color: 'text-plum-400', bgColor: 'bg-plum-100', icon: 'Gamepad2' },
  tecnologia: { key: 'tecnologia', label: 'Tecnologia', color: 'text-sky-400', bgColor: 'bg-sky-100', icon: 'Cpu' },
  servicos: { key: 'servicos', label: 'Servicos', color: 'text-ink-500', bgColor: 'bg-sand-100', icon: 'Wrench' },
  farmacia: { key: 'farmacia', label: 'Farmacia', color: 'text-jade-400', bgColor: 'bg-jade-100', icon: 'Pill' },
  pet: { key: 'pet', label: 'Pet', color: 'text-ember-300', bgColor: 'bg-ember-100', icon: 'PawPrint' },
  assinaturas: { key: 'assinaturas', label: 'Assinaturas', color: 'text-plum-500', bgColor: 'bg-plum-100', icon: 'RefreshCw' },
  financeiro: { key: 'financeiro', label: 'Financeiro', color: 'text-ruby-400', bgColor: 'bg-ruby-100', icon: 'Landmark' },
  outros: { key: 'outros', label: 'Outros', color: 'text-ink-400', bgColor: 'bg-sand-200', icon: 'Package' },
};

export interface Person {
  id: string;
  name: string;
}
