import { z } from "zod";
import { AUDIENCES, UNITS } from "./types";

/**
 * Form validation. Error messages are translation keys (see i18n.tsx),
 * shown with t(issue.message).
 */

const name = z.string().trim().min(1, "v.required");

export const loginSchema = z.object({
  username: z.string().trim().min(1, "v.required"),
  password: z.string().min(1, "v.required"),
});

/** Login name: Sinhala or English, one word. */
const username = z.string().trim().min(2, "v.username").max(30, "v.username").regex(/^\S+$/, "v.usernameSpace");

export const newUserSchema = z.object({
  name,
  username,
  password: z.string().min(6, "v.password"),
});

export const passwordSchema = z
  .object({ password: z.string().min(6, "v.password"), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "pw.mismatch" });

export const supplyItemSchema = z.object({
  name,
  unit: z.enum(UNITS),
  qty: z.number("v.number").positive("v.positive"),
  calculated: z.number().nullable().optional(),
  note: z.string().trim(),
});

export const supplySchema = z.object({
  audience: z.enum(AUDIENCES),
  title: name,
  eventDate: z.string().min(1, "v.required"),
  meal: z.string().min(1, "v.required"),
  guestCount: z.number("v.number").int().min(1, "v.guests"),
  days: z.number("v.number").int().min(1, "v.days").nullable().optional(),
  dishes: z.array(z.object({ id: z.string(), name: z.string() })),
  items: z.array(supplyItemSchema).min(1, "v.items"),
});

export const leftoverItemSchema = z.object({
  dish: name,
  portions: z.number("v.number").int().positive("v.positive"),
  note: z.string().trim(),
});

export const transferSchema = z.object({
  date: z.string().min(1, "v.required"),
  items: z.array(leftoverItemSchema).min(1, "v.leftovers"),
  recipients: z.array(z.string().trim().min(1)).min(1, "v.recipients"),
});

export const ingredientSchema = z.object({
  name,
  unit: z.enum(UNITS),
  qtyPerPerson: z.number("v.number").positive("v.positive"),
});

export const recipeSchema = z.object({
  name,
  category: name,
  ingredients: z.array(ingredientSchema),
});

/** Map Zod issues to { "items.2.qty": "v.positive", ... } for inline errors. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
