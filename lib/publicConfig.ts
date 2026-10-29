/**
 * Configuration publique de Supabase.
 *
 * La clé "publishable" est conçue pour être visible : elle est envoyée à chaque navigateur.
 * La sécurité des données repose sur les règles RLS de supabase/schema.sql, pas sur ce secret.
 * Les variables d'environnement, si elles sont définies, restent prioritaires
 * (pratique pour pointer vers un autre projet Supabase en développement).
 *
 * Ne JAMAIS mettre ici la clé secrète (sb_secret_... / service_role).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kfwtwojjvdqobdaahzwy.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_2KJkp_l1mKEckeME1Q39ng_r9QeyDAe";

/** Mettre NEXT_PUBLIC_DEMO=1 pour forcer le mode démo (sans base de données). */
export const FORCE_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
