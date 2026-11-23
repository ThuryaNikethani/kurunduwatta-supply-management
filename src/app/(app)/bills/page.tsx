"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Receipt, Trash2, X } from "lucide-react";
import { CardsSkeleton, EmptyState, Field, PageHeader } from "@/components/common";
import { PrintButton, PrintHeader } from "@/components/PrintHeader";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { backend } from "@/lib/backend";
import { readBillPhoto } from "@/lib/bill-ocr";
import { shrinkBillPhoto } from "@/lib/bill-photo";
import { formatDate, today } from "@/lib/format";
import { useBills } from "@/lib/hooks";
import { errorText, useI18n } from "@/lib/i18n";
import { currentMonth, shiftMonth } from "@/lib/reports";
import type { Bill, BillDetails, BillItem } from "@/lib/types";

const MONTHS = ["ජනවාරි", "පෙබරවාරි", "මාර්තු", "අප්‍රේල්", "මැයි", "ජූනි", "ජූලි", "අගෝස්තු", "සැප්තැම්බර්", "ඔක්තෝබර්", "නොවැම්බර්", "දෙසැම්බර්"];
const monthName = (m: string) => `${m.slice(0, 4)} ${MONTHS[Number(m.slice(5, 7)) - 1]}`;

/** Rupees, e.g. "රු. 1,250.00". */
const rs = (n: number) => `රු. ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round = (n: number) => Math.round(n * 100) / 100;

/** The form while adding or correcting a bill. Amounts are kept as typed text. */
interface Draft {
  id?: string;
  photoUrl: string;
  photo?: Blob;
  reading: boolean;
  shop: string;
  date: string;
  total: string;
  items: { name: string; qty: string; amount: string }[];
  /** Set after HR was warned that the same bill is already saved. */
  dupOk?: boolean;
}

/** True if the date is within the last 60 days. An older bill date is pointed out, as it may be misread. */
function recent(date: string) {
  if (!date) return false;
  const days = (Date.now() - new Date(`${date}T00:00:00`).getTime()) / 86_400_000;
  return days >= -1 && days <= 60;
}

const blankLine = () => ({ name: "", qty: "", amount: "" });
const amountText = (n: number) => (n ? String(n) : "");

function fromDetails(d: BillDetails) {
  return {
    shop: d.shop,
    date: d.date,
    total: amountText(d.total),
    items: d.items.length ? d.items.map((i) => ({ name: i.name, qty: i.qty, amount: amountText(i.amount) })) : [blankLine()],
  };
}

export default function BillsPage() {
  const { t } = useI18n();
  const bills = useBills();
  const [month, setMonth] = useState(currentMonth);
  const [day, setDay] = useState("");
  const [showItems, setShowItems] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<{ date?: string; total?: string }>({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState<Bill | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const formTop = useRef<HTMLDivElement>(null);

  const shown = useMemo(
    () => (bills.data ?? []).filter((b) => (day ? b.date === day : b.date.startsWith(month))),
    [bills.data, day, month],
  );
  const sum = round(shown.reduce((s, b) => s + b.total, 0));

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error(t("bills.notImage"));
    let photo: Blob;
    try {
      photo = await shrinkBillPhoto(file);
    } catch {
      return toast.error(t("bills.notImage"));
    }
    const photoUrl = URL.createObjectURL(photo);
    setErrors({});
    setDraft({ photoUrl, photo, reading: true, shop: "", date: today(), total: "", items: [blankLine()] });
    setTimeout(() => formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    try {
      // The full photo reads better than the small copy that is kept.
      const details = await readBillPhoto(file).catch(() => readBillPhoto(photo));
      // The bill's own date decides its month; today's date only when none was read.
      const read = fromDetails(details);
      setDraft((d) => (d && d.photoUrl === photoUrl ? { ...d, reading: false, ...read, date: read.date || today() } : d));
    } catch {
      setDraft((d) => (d && d.photoUrl === photoUrl ? { ...d, reading: false } : d));
      toast.error(t("bills.readFailed"));
    }
  }

  function edit(b: Bill) {
    setErrors({});
    setDraft({ id: b.id, photoUrl: b.url, reading: false, ...fromDetails(b) });
    setTimeout(() => formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function close() {
    if (draft?.photo) URL.revokeObjectURL(draft.photoUrl);
    setDraft(null);
  }

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateLine = (i: number, patch: Partial<Draft["items"][number]>) =>
    setDraft((d) => (d ? { ...d, items: d.items.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : d));

  const toNum = (s: string) => {
    const n = Number(s.replace(/,/g, "").trim());
    return Number.isFinite(n) && n > 0 ? round(n) : 0;
  };
  const lineSum = draft ? round(draft.items.reduce((s, l) => s + toNum(l.amount), 0)) : 0;
  const draftTotal = draft ? toNum(draft.total) : 0;
  const duplicate =
    !!draft &&
    (bills.data ?? []).some(
      (b) => b.id !== draft.id && b.date === draft.date && Math.abs(b.total - draftTotal) < 0.01 && b.shop.trim() === draft.shop.trim(),
    );
  const mismatch = !!draft && lineSum > 0 && draftTotal > 0 && Math.abs(lineSum - draftTotal) >= 0.01;

  async function save() {
    if (!draft) return;
    const next: typeof errors = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) next.date = "bills.needDate";
    if (!draftTotal) next.total = "bills.needTotal";
    setErrors(next);
    if (Object.keys(next).length) return;
    const items: BillItem[] = draft.items
      .map((l) => ({ name: l.name.trim(), qty: l.qty.trim(), amount: toNum(l.amount) }))
      .filter((l) => l.name || l.amount);
    const details: BillDetails = { shop: draft.shop.trim(), date: draft.date, total: draftTotal, items };
    // The same shop, date and total saved before is most likely the same bill.
    if (!draft.dupOk && duplicate) {
      update({ dupOk: true });
      return;
    }
    setSaving(true);
    try {
      if (draft.id) await backend.updateBill(draft.id, details);
      else await backend.addBill(draft.photo!, details);
      toast.success(t("bills.savedTo", { month: monthName(details.date.slice(0, 7)) }));
      // Show the month the bill belongs to.
      setDay("");
      setMonth(details.date.slice(0, 7));
      close();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await backend.deleteBill(deleting.id);
      toast.success(t("bills.deleted"));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setDeleting(null);
    }
  }

  const heading = day ? `${t("bills.report")} · ${formatDate(day)}` : `${t("bills.report")} · ${monthName(month)}`;

  return (
    <div className="grid gap-6">
      <PrintHeader heading={heading} />
      <PageHeader title={t("bills.title")} subtitle={<span className="no-print">{t("bills.help")}</span>} actions={<PrintButton />} />

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pickPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {!draft && (
        <Button variant="accent" size="lg" className="no-print h-14 justify-self-start text-base" onClick={() => fileInput.current?.click()}>
          <Camera className="size-5" /> {t("bills.add")}
        </Button>
      )}

      {draft && (
        <div ref={formTop} className="no-print scroll-mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl">{draft.id ? t("bills.edit") : t("bills.new")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <button type="button" className="self-start overflow-hidden rounded-xl border bg-muted" onClick={() => window.open(draft.photoUrl, "_blank")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.photoUrl} alt={t("bills.photo")} className="max-h-[70vh] w-full object-contain" />
              </button>

              <div className="grid content-start gap-4">
                {draft.reading ? (
                  <p className="flex items-center gap-2 rounded-xl bg-amber/15 p-4 text-base">
                    <Loader2 className="size-5 animate-spin" /> {t("bills.reading")}
                  </p>
                ) : (
                  <p className="rounded-xl bg-leaf/20 p-3 text-sm">{t("bills.check")}</p>
                )}

                <fieldset disabled={draft.reading || saving} className="grid gap-4">
                  <Field label={t("bills.shop")} htmlFor="b-shop">
                    <Input id="b-shop" value={draft.shop} onChange={(e) => update({ shop: e.target.value })} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("bills.date")} htmlFor="b-date" error={errors.date}>
                      <Input id="b-date" type="date" max={today()} value={draft.date} aria-invalid={!!errors.date}
                        onChange={(e) => update({ date: e.target.value })} />
                    </Field>
                    <Field label={t("bills.total")} htmlFor="b-total" error={errors.total}>
                      <Input id="b-total" inputMode="decimal" value={draft.total} aria-invalid={!!errors.total}
                        onChange={(e) => update({ total: e.target.value })} />
                    </Field>
                  </div>

                  <div className="grid gap-2">
                    <p className="text-sm font-medium">{t("bills.items")}</p>
                    <div className="hidden grid-cols-[minmax(0,1fr)_6rem_7rem_2.5rem] gap-2 text-xs text-muted-foreground sm:grid">
                      <span>{t("bills.item")}</span><span>{t("bills.qty")}</span><span>{t("bills.amount")}</span><span />
                    </div>
                    {draft.items.map((l, i) => (
                      <div key={i} className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2 rounded-xl border p-2 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_2.5rem] sm:border-0 sm:p-0">
                        <Input aria-label={t("bills.item")} placeholder={t("bills.item")} value={l.name}
                          onChange={(e) => updateLine(i, { name: e.target.value })} />
                        <Button type="button" variant="ghost" size="icon" aria-label={t("bills.removeItem")} className="sm:order-last"
                          onClick={() => update({ items: draft.items.length > 1 ? draft.items.filter((_, j) => j !== i) : [blankLine()] })}>
                          <X />
                        </Button>
                        <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-[6rem_7rem]">
                          <Input aria-label={t("bills.qty")} placeholder={t("bills.qty")} value={l.qty}
                            onChange={(e) => updateLine(i, { qty: e.target.value })} />
                          <Input aria-label={t("bills.amount")} placeholder={t("bills.amount")} inputMode="decimal" value={l.amount}
                            onChange={(e) => updateLine(i, { amount: e.target.value })} />
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="justify-self-start" onClick={() => update({ items: [...draft.items, blankLine()] })}>
                      <Plus /> {t("bills.addItem")}
                    </Button>
                  </div>

                  {/^\d{4}-\d{2}-\d{2}$/.test(draft.date) && !recent(draft.date) && (
                    <div role="status" className="grid gap-2 rounded-xl bg-amber/20 p-3 text-sm">
                      <p>{t("bills.oldDate", { date: formatDate(draft.date), month: monthName(draft.date.slice(0, 7)) })}</p>
                      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => update({ date: today() })}>
                        {t("bills.useToday")}
                      </Button>
                    </div>
                  )}
                  {draft.dupOk && duplicate && (
                    <p role="alert" className="rounded-xl bg-amber/20 p-3 text-sm">{t("bills.duplicate")}</p>
                  )}
                  {mismatch && (
                    <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                      {t("bills.mismatch", { sum: rs(lineSum), total: rs(draftTotal) })}
                    </p>
                  )}
                </fieldset>

                <div className="flex flex-wrap gap-2">
                  <Button variant="accent" size="lg" disabled={draft.reading || saving} onClick={save}>
                    {saving ? t("saving") : draft.dupOk && duplicate ? t("bills.saveAgain") : t("save")}
                  </Button>
                  <Button variant="outline" size="lg" disabled={saving} onClick={close}>{t("cancel")}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="no-print grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" aria-label={t("reports.prev")} disabled={!!day} onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeft />
          </Button>
          <span className="min-w-40 text-center font-display text-xl font-semibold">{monthName(month)}</span>
          <Button variant="outline" size="icon" aria-label={t("reports.next")} disabled={!!day || month >= currentMonth()}
            onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            <ChevronRight />
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("bills.searchDay")} htmlFor="b-day">
            <Input id="b-day" type="date" max={today()} value={day} className="w-48"
              onChange={(e) => { setDay(e.target.value); if (e.target.value) setMonth(e.target.value.slice(0, 7)); }} />
          </Field>
          {day && <Button variant="outline" onClick={() => setDay("")}>{t("bills.wholeMonth")}</Button>}
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-base">
          <input type="checkbox" className="size-5 accent-amber-deep" checked={showItems} onChange={(e) => setShowItems(e.target.checked)} />
          {t("bills.showItems")}
        </label>
      </div>

      {!bills.data ? (
        bills.error ? <p className="text-destructive">{errorText(bills.error)}</p> : <CardsSkeleton count={3} />
      ) : shown.length === 0 ? (
        <EmptyState icon={Receipt} text={day ? t("bills.emptyDay") : t("bills.empty")} />
      ) : (
        <Card className="print-flow">
          <CardContent className="grid gap-0 divide-y p-0">
            {shown.map((b) => (
              <div key={b.id} className="grid gap-2 p-4 break-inside-avoid">
                <div className="flex items-start gap-3">
                  <button type="button" className="no-print size-14 shrink-0 overflow-hidden rounded-lg border bg-muted" onClick={() => setViewing(b)} aria-label={t("bills.photo")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.url} alt="" className="size-full object-cover" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{b.shop || t("bills.noShop")}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(b.date)}</p>
                  </div>
                  <p className="shrink-0 text-right text-base font-semibold tabular-nums">{rs(b.total)}</p>
                </div>
                {showItems && b.items.length > 0 && (
                  <ul className="ml-0 grid gap-1 rounded-lg bg-muted/50 p-3 text-sm sm:ml-17">
                    {b.items.map((it, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="min-w-0 flex-1">{it.name}</span>
                        {it.qty && <span className="text-muted-foreground">{it.qty}</span>}
                        <span className="w-28 text-right tabular-nums">{it.amount ? rs(it.amount) : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="no-print flex flex-wrap items-center gap-2 sm:ml-17">
                  <span className="mr-auto text-xs text-muted-foreground">{t("bills.by", { name: b.createdByName })}</span>
                  <Button variant="outline" size="sm" onClick={() => edit(b)}><Pencil /> {t("bills.edit")}</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(b)}><Trash2 /> {t("bills.delete")}</Button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 bg-muted/40 p-4 break-inside-avoid">
              <div>
                <p className="font-display text-lg font-semibold">{day ? t("bills.dayTotal") : t("bills.monthTotal")}</p>
                <p className="text-sm text-muted-foreground">{t("bills.count", { n: shown.length })}</p>
              </div>
              <p className="text-xl font-bold tabular-nums">{rs(sum)}</p>
            </div>
          </CardContent>
        </Card>
      )}


      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewing?.shop || t("bills.noShop")}</DialogTitle>
            <DialogDescription>{viewing && `${formatDate(viewing.date)} · ${rs(viewing.total)}`}</DialogDescription>
          </DialogHeader>
          {viewing && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewing.url} alt={t("bills.photo")} className="max-h-[75vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bills.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && `${deleting.shop || t("bills.noShop")} · ${formatDate(deleting.date)} · ${rs(deleting.total)}`}
              <br />
              {t("bills.deleteHelp")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={remove}>{t("bills.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
