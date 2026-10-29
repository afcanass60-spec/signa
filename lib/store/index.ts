"use client";
import { demoStore } from "./demo";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";
import { FORCE_DEMO, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../publicConfig";

export const isDemo = FORCE_DEMO || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY;

export const store: Store = isDemo ? demoStore : supabaseStore;

export type { AppUser, Attempt, Store, Template } from "./types";
