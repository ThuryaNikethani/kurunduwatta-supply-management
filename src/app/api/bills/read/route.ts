import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminClient, callerProfile } from "@/lib/supabase-admin";

export const runtime = "nodejs";
// Reading a photo can take a little while.
export const maxDuration = 60;

const input = z.object({
  image: z.string().min(100).max(8_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const BillSchema = z.object({
  shop: z.string(),
  date: z.string(),
  total: z.number(),
  items: z.array(z.object({ name: z.string(), qty: z.string(), amount: z.number() })),
});

const PROMPT = `This is a photo of a shop bill (receipt) from Sri Lanka. It may be printed or handwritten, in Sinhala, English or both.

Read it carefully and give back:
- shop: the shop's name as written on the bill. Empty string if there is none.
- date: the bill's date as YYYY-MM-DD. Empty string if you cannot read it.
- total: the final total in rupees, as a plain number. If the bill shows no total, add up the item prices.
- items: every line on the bill, in order. name = the item exactly as written (keep Sinhala in Sinhala), qty = the amount as written (for example "2 kg" or "500g"; empty string if none), amount = the line price in rupees as a plain number.

Copy numbers exactly as they appear; do not round or guess. If a number cannot be read, use 0 so a person can fill it in.`;

/** HR sends a bill photo; Claude reads the shop, date, total and items for HR to check. */
export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const caller = await callerProfile(admin, req.headers.get("authorization"));
  if (!caller) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (caller.role !== "hr") return NextResponse.json({ error: "permission denied", code: "permission" }, { status: 403 });

  const parsed = input.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  // Without a key, HR simply types the details.
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ details: null, off: true });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(BillSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: parsed.data.mediaType, data: parsed.data.image } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
    const out = response.stop_reason === "refusal" ? null : response.parsed_output;
    if (!out) return NextResponse.json({ details: null });
    const date = /^\d{4}-\d{2}-\d{2}$/.test(out.date) ? out.date : "";
    const money = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0);
    return NextResponse.json({
      details: {
        shop: out.shop.trim(),
        date,
        total: money(out.total),
        items: out.items
          .map((i) => ({ name: i.name.trim(), qty: i.qty.trim(), amount: money(i.amount) }))
          .filter((i) => i.name || i.amount),
      },
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error("bill read failed", e.status, e.message);
      return NextResponse.json({ error: "could not read the bill", code: "bill-read" }, { status: 502 });
    }
    throw e;
  }
}
