/** Outils côté serveur uniquement (routes /api). Ne jamais importer dans un composant client. */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { SUPABASE_URL } from "./publicConfig";

export function adminClient() {
  const url = SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase n'est pas configuré (voir .env.example).");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe n'est pas configuré (voir .env.example).");
  return new Stripe(key);
}

export function siteUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

/** Vérifie le jeton envoyé par le navigateur et renvoie l'utilisateur. */
export async function userFromRequest(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
