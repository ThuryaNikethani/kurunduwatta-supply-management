import { supabaseConfigured } from "../supabase";
import { demoBackend } from "./demo";
import { supabaseBackend } from "./supabase";
import type { Backend } from "./types";

/**
 * NEXT_PUBLIC_BACKEND=demo uses browser-only practice data; otherwise the
 * real Supabase database is used when its keys are set.
 */
const wanted = process.env.NEXT_PUBLIC_BACKEND;

export const backend: Backend = wanted === "demo" || !supabaseConfigured ? demoBackend : supabaseBackend;

export const isDemo = backend.name === "demo";

export type { Backend, AuthSnapshot, PushState, Unsub } from "./types";
