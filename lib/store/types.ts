/** Contrat commun aux deux modes de stockage (démo locale ou Supabase). */

export interface AppUser {
  id: string;
  email: string;
  isPremium: boolean;
  isAdmin: boolean;
}

export interface Template {
  id: string;
  signSlug: string;
  frames: number[][]; // séquence normalisée, 30 × 203
  createdAt: string;
}

export interface Attempt {
  signSlug: string;
  score: number;
  createdAt: string;
}

export interface Store {
  mode: "demo" | "supabase";
  getUser(): Promise<AppUser | null>;
  onAuthChange(cb: () => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;

  listTemplates(signSlug: string): Promise<Template[]>;
  countTemplates(): Promise<Record<string, number>>;
  saveTemplate(signSlug: string, frames: number[][], premium: boolean): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  exportTemplates(): Promise<Template[]>;
  importTemplates(list: Template[], premiumOf: (slug: string) => boolean): Promise<number>;

  addAttempt(signSlug: string, score: number): Promise<void>;
  listAttempts(): Promise<Attempt[]>;

  /** Démarre l'abonnement. En démo : simulé. En prod : redirection vers Stripe. */
  startCheckout(): Promise<void>;
  openBillingPortal(): Promise<void>;
}
