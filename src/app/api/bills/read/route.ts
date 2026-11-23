import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminClient, callerProfile } from "@/lib/supabase-admin";

export const runtime = "nodejs";
// Reading a photo can take a little while.
export const maxDuration = 60;

/**
 * HR sends a bill photo; Google Gemini (free key) reads the shop, date, total and items.
 * Without a key, or if Gemini cannot answer, the page reads the photo itself with Tesseract.
 */

const input = z.object({
  image: z.string().min(100).max(6_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const Answer = z.object({
  shop: z.string().default(""),
  date: z.string().default(""),
  total: z.coerce.number().default(0),
  items: z
    .array(z.object({ name: z.string().default(""), qty: z.string().default(""), amount: z.coerce.number().default(0) }))
    .default([]),
});

// Flash-Lite answers in a few seconds and read the test bills correctly; Flash is tried when it is busy.
// GEMINI_MODEL can name another model to try first.
const MODELS = [process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-flash-latest"].filter(Boolean) as string[];

const PROMPT = `This is a photo of a shop bill (receipt) from Sri Lanka. It may be printed or handwritten, in Sinhala, English or both.

Read it carefully and answer with:
- shop: the shop's name as written at the top of the bill (Sinhala stays in Sinhala). Empty string if there is none.
- date: the bill's date as YYYY-MM-DD. Sri Lankan bills write the day first (8/4/2022 is 8 April 2022). Empty string if you cannot read it.
- total: the final total in rupees as a plain number (the "Total" / "Net Total" / "මුළු එකතුව" line, not the cash given or the change). If there is no total, add up the item amounts.
- items: every item line in order. name = the item exactly as written; qty = the amount as written (for example "1", "2 kg", "500g"), empty string if none; amount = the line's final amount in rupees as a plain number.

Copy numbers exactly as printed; do not round or guess. If a number cannot be read, use 0 so a person can fill it in.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    shop: { type: "STRING" },
    date: { type: "STRING" },
    total: { type: "NUMBER" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, qty: { type: "STRING" }, amount: { type: "NUMBER" } },
        required: ["name", "qty", "amount"],
      },
    },
  },
  required: ["shop", "date", "total", "items"],
};

async function askGemini(model: string, key: string, image: string, mediaType: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mediaType, data: image } }, { text: PROMPT }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: SCHEMA },
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return { status: res.status, details: null };
  const data = await res.json();
  const text: string = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  const parsed = Answer.safeParse(JSON.parse(text || "{}"));
  return { status: 200, details: parsed.success ? parsed.data : null };
}

export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const caller = await callerProfile(admin, req.headers.get("authorization"));
  if (!caller) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (caller.role !== "hr") return NextResponse.json({ error: "permission denied", code: "permission" }, { status: 403 });

  const parsed = input.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ details: null, off: true });

  for (const model of MODELS) {
    try {
      const { status, details } = await askGemini(model, key, parsed.data.image, parsed.data.mediaType);
      // Limit reached or a bad key: the phone reads the photo instead. Busy or unknown model: try the next one.
      if ([401, 403, 429].includes(status)) {
        console.error("bill read: gemini answered", status);
        return NextResponse.json({ details: null });
      }
      if (status !== 200) continue;
      if (!details) {
        console.error("bill read: gemini answered", status, "with", model);
        return NextResponse.json({ details: null });
      }
      const money = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0);
      return NextResponse.json({
        details: {
          shop: details.shop.trim(),
          date: /^\d{4}-\d{2}-\d{2}$/.test(details.date) ? details.date : "",
          total: money(details.total),
          items: details.items
            .map((i) => ({ name: i.name.trim(), qty: i.qty.trim(), amount: money(i.amount) }))
            .filter((i) => i.name || i.amount),
        },
      });
    } catch (e) {
      // Too slow or an odd answer: try the next model.
      console.error("bill read failed with", model, e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json({ details: null });
}
