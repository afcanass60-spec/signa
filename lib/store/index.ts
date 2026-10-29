"use client";
import { demoStore } from "./demo";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const store: Store = isDemo ? demoStore : supabaseStore;

export type { AppUser, Attempt, Store, Template } from "./types";
