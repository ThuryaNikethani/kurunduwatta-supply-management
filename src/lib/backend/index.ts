import { firebaseConfigured } from "../firebase";
import { demoBackend } from "./demo";
import { firebaseBackend } from "./firebase";
import type { Backend } from "./types";

/**
 * Pick the backend: NEXT_PUBLIC_BACKEND=demo forces demo mode; otherwise
 * Firebase is used when its keys are set. To move to another provider
 * (e.g. Supabase), add an implementation of `Backend` and select it here.
 */
const wanted = process.env.NEXT_PUBLIC_BACKEND;

export const backend: Backend =
  wanted === "demo" || !firebaseConfigured ? demoBackend : firebaseBackend;

export const isDemo = backend.name === "demo";

export type { Backend, AuthSnapshot, PushState, Unsub } from "./types";
