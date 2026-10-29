"use client";
/**
 * Mode démo : tout est gardé dans le navigateur (localStorage).
 * Permet de lancer l'app avec `npm run dev` sans aucun compte ni configuration.
 */
import type { AppUser, Attempt, Store, Template } from "./types";

const KEY = "signa-demo-v1";

interface DemoData {
  templates: Template[];
  attempts: Attempt[];
  premium: boolean;
}

function load(): DemoData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DemoData;
  } catch {
    /* stockage indisponible : on repart de zéro */
  }
  return { templates: [], attempts: [], premium: false };
}

function save(d: DemoData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch (e) {
    throw new Error("Impossible d'enregistrer dans ce navigateur (stockage plein ou bloqué). " + String(e));
  }
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((cb) => cb());

export const demoStore: Store = {
  mode: "demo",

  async getUser(): Promise<AppUser> {
    return { id: "demo", email: "Mode démo", isPremium: load().premium, isAdmin: true };
  },
  onAuthChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  async signIn() {},
  async signUp() {
    return { needsConfirmation: false };
  },
  async signOut() {},

  async listTemplates(slug) {
    return load().templates.filter((t) => t.signSlug === slug);
  },
  async countTemplates() {
    const counts: Record<string, number> = {};
    for (const t of load().templates) counts[t.signSlug] = (counts[t.signSlug] ?? 0) + 1;
    return counts;
  },
  async saveTemplate(signSlug, frames) {
    const d = load();
    d.templates.push({ id: crypto.randomUUID(), signSlug, frames, createdAt: new Date().toISOString() });
    save(d);
  },
  async deleteTemplate(id) {
    const d = load();
    d.templates = d.templates.filter((t) => t.id !== id);
    save(d);
  },
  async exportTemplates() {
    return load().templates;
  },
  async importTemplates(list) {
    const d = load();
    const ids = new Set(d.templates.map((t) => t.id));
    const fresh = list.filter((t) => !ids.has(t.id));
    d.templates.push(...fresh);
    save(d);
    return fresh.length;
  },

  async addAttempt(signSlug, score) {
    const d = load();
    d.attempts.push({ signSlug, score, createdAt: new Date().toISOString() });
    d.attempts = d.attempts.slice(-2000);
    save(d);
  },
  async listAttempts() {
    return load().attempts;
  },

  async startCheckout() {
    const d = load();
    d.premium = true;
    save(d);
    notify();
  },
  async openBillingPortal() {
    const d = load();
    d.premium = false;
    save(d);
    notify();
  },
};
