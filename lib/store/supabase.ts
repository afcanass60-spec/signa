"use client";
/**
 * Mode production : Supabase (authentification + base Postgres).
 * Les droits sont vérifiés côté base par les règles RLS de supabase/schema.sql :
 * même en trichant dans le navigateur, un utilisateur gratuit ne lit pas les références
 * des leçons premium et ne peut pas se déclarer premium lui-même.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppUser, Store, Template } from "./types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../publicConfig";

let client: SupabaseClient | null = null;
export function supabase() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  return client;
}

interface TemplateRow {
  id: string;
  sign_slug: string;
  frames: number[][];
  created_at: string;
}
const toTemplate = (r: TemplateRow): Template => ({ id: r.id, signSlug: r.sign_slug, frames: r.frames, createdAt: r.created_at });

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

async function authedPost(path: string) {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Connecte-toi d'abord.");
  const res = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(body.error ?? "Le paiement est indisponible pour le moment.");
  window.location.href = body.url;
}

export const supabaseStore: Store = {
  mode: "supabase",

  async getUser(): Promise<AppUser | null> {
    const { data } = await supabase().auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await supabase()
      .from("profiles")
      .select("is_premium, is_admin")
      .eq("id", data.user.id)
      .maybeSingle();
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      isPremium: !!profile?.is_premium,
      isAdmin: !!profile?.is_admin,
    };
  },
  onAuthChange(cb) {
    const { data } = supabase().auth.onAuthStateChange(() => cb());
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou mot de passe incorrect." : error.message);
  },
  async signUp(email, password) {
    const { data, error } = await supabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/apprendre` },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  },
  async signOut() {
    await supabase().auth.signOut();
  },

  async listTemplates(slug) {
    const rows = check(await supabase().from("templates").select("id, sign_slug, frames, created_at").eq("sign_slug", slug));
    return (rows as TemplateRow[]).map(toTemplate);
  },
  async countTemplates() {
    const rows = check(await supabase().from("templates").select("sign_slug")) as { sign_slug: string }[];
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.sign_slug] = (counts[r.sign_slug] ?? 0) + 1;
    return counts;
  },
  async saveTemplate(signSlug, frames, premium) {
    const { data } = await supabase().auth.getUser();
    check(await supabase().from("templates").insert({ sign_slug: signSlug, frames, premium, created_by: data.user?.id }));
  },
  async deleteTemplate(id) {
    check(await supabase().from("templates").delete().eq("id", id));
  },
  async exportTemplates() {
    const rows = check(await supabase().from("templates").select("id, sign_slug, frames, created_at"));
    return (rows as TemplateRow[]).map(toTemplate);
  },
  async importTemplates(list, premiumOf) {
    const { data } = await supabase().auth.getUser();
    const rows = list.map((t) => ({ sign_slug: t.signSlug, frames: t.frames, premium: premiumOf(t.signSlug), created_by: data.user?.id }));
    check(await supabase().from("templates").insert(rows));
    return rows.length;
  },

  async addAttempt(signSlug, score) {
    const { data } = await supabase().auth.getUser();
    if (!data.user) return;
    check(await supabase().from("attempts").insert({ user_id: data.user.id, sign_slug: signSlug, score }));
  },
  async listAttempts() {
    const rows = check(
      await supabase().from("attempts").select("sign_slug, score, created_at").order("created_at", { ascending: true }).limit(5000),
    ) as { sign_slug: string; score: number; created_at: string }[];
    return rows.map((r) => ({ signSlug: r.sign_slug, score: r.score, createdAt: r.created_at }));
  },

  startCheckout: () => authedPost("/api/checkout"),
  openBillingPortal: () => authedPost("/api/portal"),
};
