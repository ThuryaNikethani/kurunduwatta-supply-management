"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { History, Minus, Package, Pencil, Plus, Search, ShoppingCart, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { EmptyState, Field, PageHeader } from "@/components/common";
import { UnitSelect } from "@/components/SupplyForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { backend } from "@/lib/backend";
import { formatDateTime, qty } from "@/lib/format";
import { useStock, useStockMoves } from "@/lib/hooks";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import { isLow } from "@/lib/stock";
import type { StockItem, Unit } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StockPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const stock = useStock();
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState<StockItem | "new" | null>(null);
  const [adjusting, setAdjusting] = useState<StockItem | null>(null);
  const [historyOf, setHistoryOf] = useState<StockItem | null>(null);
  const canEdit = profile?.role === "supervisor" || profile?.role === "hr";

  const low = (stock ?? []).filter(isLow);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (stock ?? []).filter((i) => (!q || i.name.toLowerCase().includes(q)) && (!onlyLow || isLow(i)));
  }, [stock, search, onlyLow]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("stock.title")}
        subtitle={t("stock.intro")}
        actions={
          canEdit && (
            <>
              {profile?.role === "supervisor" && low.length > 0 && (
                <Button asChild variant="outline">
                  <Link href="/orders/new?low=1"><ShoppingCart /> {t("stock.orderLow")}</Link>
                </Button>
              )}
              <Button variant="accent" onClick={() => setEditing("new")}><Plus /> {t("stock.add")}</Button>
            </>
          )
        }
      />

      {stock && stock.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="bg-card pl-9" placeholder={t("dash.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-muted-foreground">{t("stock.items", { n: stock.length })}</span>
          {low.length > 0 && (
            <Button variant={onlyLow ? "default" : "outline"} size="sm" onClick={() => setOnlyLow((v) => !v)}
              className={cn(!onlyLow && "border-amber/60 text-amber-deep")}>
              <TriangleAlert /> {t("stock.lowCount", { n: low.length })}
            </Button>
          )}
        </div>
      )}

      {!stock ? (
        <Skeleton className="h-64" />
      ) : stock.length === 0 ? (
        <EmptyState icon={Package} text={t("stock.empty")} />
      ) : (
        <Card className="py-2">
          <CardContent className="px-2 sm:px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("stock.item")}</TableHead>
                  <TableHead className="text-right">{t("stock.have")}</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">{t("stock.min")}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((i) => (
                  <TableRow key={i.id} className={cn(isLow(i) && "bg-amber/10 hover:bg-amber/15")}>
                    <TableCell className="font-medium">
                      {i.name}
                      {isLow(i) && (
                        <Badge variant="secondary" className="ml-2 rounded-full bg-amber/25 text-amber-deep">
                          <TriangleAlert /> {t("stock.low")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{qty(i.qty, i.unit)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                      {i.minQty ? qty(i.minQty, i.unit) : "—"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon-sm" aria-label={t("stock.history")} onClick={() => setHistoryOf(i)}><History /></Button>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon-sm" aria-label={t("stock.edit")} onClick={() => setEditing(i)}><Pencil /></Button>
                          <Button variant="outline" size="sm" className="ml-1" onClick={() => setAdjusting(i)}>
                            <SlidersHorizontal /> <span className="hidden sm:inline">{t("stock.adjust")}</span>
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ItemDialog item={editing} onClose={() => setEditing(null)} />
      <AdjustDialog item={adjusting} onClose={() => setAdjusting(null)} />
      <HistoryDialog item={historyOf} onClose={() => setHistoryOf(null)} />
    </div>
  );
}

function ItemDialog({ item, onClose }: { item: StockItem | "new" | null; onClose: () => void }) {
  const { t } = useI18n();
  const isNew = item === "new";
  const cur = item && item !== "new" ? item : null;
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Unit>("kg");
  const [minQty, setMinQty] = useState(0);
  const [start, setStart] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<StockItem | "new" | null>(null);

  if (item !== openedFor) {
    setOpenedFor(item);
    setName(cur?.name ?? "");
    setUnit(cur?.unit ?? "kg");
    setMinQty(cur?.minQty ?? 0);
    setStart(0);
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("v.required");
    setBusy(true);
    try {
      if (isNew) {
        const id = await backend.addStockItem({ name, unit, minQty });
        if (start > 0) await backend.changeStock(id, start, t("stock.startNote"));
      } else if (cur) {
        await backend.updateStockItem(cur.id, { name, unit, minQty });
      }
      toast.success(t("stock.saved"));
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{isNew ? t("stock.add") : cur?.name}</DialogTitle>
          </DialogHeader>
          <Field label={t("stock.item")} htmlFor="s-name" error={error}>
            <Input id="s-name" value={name} aria-invalid={!!error} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("supply.unit")}>
              <UnitSelect value={unit} onChange={setUnit} />
            </Field>
            <Field label={t("stock.min")} htmlFor="s-min">
              <Input id="s-min" type="number" min={0} step="any" inputMode="decimal" value={minQty || ""}
                onChange={(e) => setMinQty(Math.max(0, Number(e.target.value) || 0))} />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t("stock.minHint")}</p>
          {isNew && (
            <Field label={t("stock.start")} htmlFor="s-start">
              <Input id="s-start" type="number" min={0} step="any" inputMode="decimal" value={start || ""}
                onChange={(e) => setStart(Math.max(0, Number(e.target.value) || 0))} />
            </Field>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDialog({ item, onClose }: { item: StockItem | null; onClose: () => void }) {
  const { t } = useI18n();
  const [dir, setDir] = useState<1 | -1>(1);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<StockItem | null>(null);

  if (item !== openedFor) {
    setOpenedFor(item);
    setDir(1);
    setAmount(0);
    setNote("");
    setErrors({});
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const errs: Record<string, string> = {};
    if (!(amount > 0)) errs.amount = "v.positive";
    if (!note.trim()) errs.note = "stock.reasonRequired";
    if (dir < 0 && amount > item.qty) errs.amount = "stock.notEnough";
    if (Object.keys(errs).length) return setErrors(errs);
    setBusy(true);
    try {
      await backend.changeStock(item.id, dir * amount, note.trim());
      toast.success(t("stock.saved"));
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {item && (
          <form onSubmit={save} className="grid gap-4" noValidate>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">{t("stock.adjustTitle", { name: item.name })}</DialogTitle>
              <DialogDescription>{t("stock.have")}: {qty(item.qty, item.unit)}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {([1, -1] as const).map((d) => (
                <button key={d} type="button" role="radio" aria-checked={dir === d} onClick={() => setDir(d)}
                  className={cn("flex items-center justify-center gap-2 rounded-xl border-2 p-2.5 text-sm transition",
                    dir === d ? "border-amber bg-amber/10 font-medium" : "border-border")}>
                  {d > 0 ? <Plus className="size-4" /> : <Minus className="size-4" />}
                  {t(d > 0 ? "stock.addMore" : "stock.takeOut")}
                </button>
              ))}
            </div>
            <Field label={`${t("stock.amount")} (${t(`unit.${item.unit}` as TKey)})`} htmlFor="a-amount" error={errors.amount}>
              <Input id="a-amount" type="number" min={0} step="any" inputMode="decimal" value={amount || ""}
                aria-invalid={!!errors.amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} />
            </Field>
            <Field label={t("stock.reason")} htmlFor="a-note" error={errors.note}>
              <Input id="a-note" placeholder={t("stock.reasonPh")} value={note} aria-invalid={!!errors.note}
                onChange={(e) => setNote(e.target.value)} />
            </Field>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
              <Button type="submit" variant="accent" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ item, onClose }: { item: StockItem | null; onClose: () => void }) {
  const { t } = useI18n();
  const moves = useStockMoves(item?.id ?? null);
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">{t("stock.historyTitle", { name: item.name })}</DialogTitle>
              <DialogDescription>{t("stock.have")}: {qty(item.qty, item.unit)}</DialogDescription>
            </DialogHeader>
            {!moves ? (
              <Skeleton className="h-32" />
            ) : moves.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("stock.noHistory")}</p>
            ) : (
              <ul className="divide-y">
                {moves.map((m) => (
                  <li key={m.id} className="flex items-start gap-3 py-2.5 text-sm">
                    <span className={cn("mt-0.5 w-20 shrink-0 font-medium tabular-nums", m.change > 0 ? "text-leaf-deep" : "text-destructive")}>
                      {m.change > 0 ? "+" : "−"}{qty(Math.abs(m.change), m.unit)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block">{t(`stock.reason.${m.reason}` as TKey)}{m.note ? ` · ${m.note}` : ""}</span>
                      <span className="block text-xs text-muted-foreground">
                        {m.byName} · {formatDateTime(m.createdAt)} · {t("stock.after")} {qty(m.qtyAfter, m.unit)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
