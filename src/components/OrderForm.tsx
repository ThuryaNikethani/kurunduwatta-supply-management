"use client";

import { Plus, Send, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStock } from "@/lib/hooks";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import { lowStockOrder } from "@/lib/stock";
import type { OrderItem } from "@/lib/types";
import { Field, StepTitle } from "./common";
import { UnitSelect } from "./SupplyForm";

export interface OrderFormData {
  supplier: string;
  items: OrderItem[];
}

export function OrderForm({
  initial, submitLabel, onSubmit, onCancel,
}: {
  initial?: Partial<OrderFormData>;
  submitLabel: string;
  onSubmit: (data: OrderFormData, note: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const stock = useStock();
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [items, setItems] = useState<OrderItem[]>(initial?.items?.length ? initial.items : [{ name: "", unit: "kg", qty: 0, note: "" }]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const update = (i: number, patch: Partial<OrderItem>) => setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  function addLow() {
    const low = lowStockOrder(stock ?? []);
    if (!low.length) return toast(t("orders.noLow"));
    setItems((cur) => {
      const kept = cur.filter((c) => c.name.trim());
      const have = new Set(kept.map((c) => `${c.name.toLowerCase()}|${c.unit}`));
      return [...kept, ...low.filter((l) => !have.has(`${l.name.toLowerCase()}|${l.unit}`))];
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!supplier.trim()) errs.supplier = "v.required";
    const filled = items.filter((i) => i.name.trim() || i.qty);
    filled.forEach((it) => {
      const idx = items.indexOf(it);
      if (!it.name.trim()) errs[`items.${idx}.name`] = "v.required";
      if (!(it.qty > 0)) errs[`items.${idx}.qty`] = "v.positive";
    });
    if (!filled.length) errs.items = "v.items";
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setBusy(true);
    try {
      await onSubmit({ supplier: supplier.trim(), items: filled.map((i) => ({ ...i, name: i.name.trim(), note: i.note.trim() })) }, note);
    } catch (err) {
      toast.error(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <datalist id="stock-names">
        {(stock ?? []).map((s) => <option key={s.id} value={s.name} />)}
      </datalist>
      <Card>
        <CardHeader>
          <StepTitle n={1} title={t("orders.supplier")} />
        </CardHeader>
        <CardContent>
          <Field error={errors.supplier}>
            <Input placeholder={t("orders.supplierPh")} value={supplier} aria-invalid={!!errors.supplier} aria-label={t("orders.supplier")}
              onChange={(e) => setSupplier(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <StepTitle n={2} title={t("orders.items")}
            extra={<Button type="button" variant="outline" size="sm" onClick={addLow}><TriangleAlert /> {t("orders.addLow")}</Button>} />
        </CardHeader>
        <CardContent className="grid gap-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 items-start gap-2 rounded-lg border bg-muted/30 p-2">
              <Field error={errors[`items.${i}.name`]} className="col-span-12 sm:col-span-4">
                <Input list="stock-names" className="bg-card" placeholder={t("supply.item")} value={it.name}
                  aria-invalid={!!errors[`items.${i}.name`]} onChange={(e) => update(i, { name: e.target.value })} />
              </Field>
              <Field error={errors[`items.${i}.qty`]} className="col-span-5 sm:col-span-2">
                <Input type="number" min={0} step="any" inputMode="decimal" className="bg-card" placeholder={t("supply.qty")}
                  value={it.qty || ""} aria-invalid={!!errors[`items.${i}.qty`]}
                  onChange={(e) => update(i, { qty: Math.max(0, Number(e.target.value) || 0) })} />
              </Field>
              <div className="col-span-5 sm:col-span-2">
                <UnitSelect value={it.unit} onChange={(unit) => update(i, { unit })} />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={t("remove")}
                className="col-span-2 justify-self-end text-destructive hover:text-destructive sm:order-last sm:col-span-1"
                onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
              <Input className="col-span-12 bg-card sm:col-span-3" placeholder={t("supply.note")} value={it.note}
                onChange={(e) => update(i, { note: e.target.value })} />
            </div>
          ))}
          {errors.items && <p className="text-sm text-destructive">{t(errors.items as TKey)}</p>}
          <div>
            <Button type="button" variant="outline" onClick={() => setItems((cur) => [...cur, { name: "", unit: "kg", qty: 0, note: "" }])}>
              <Plus /> {t("orders.addItem")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <Field label={t("orders.note")} htmlFor="o-note">
            <Textarea id="o-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {Object.values(errors).some(Boolean) && <p className="text-sm text-destructive">{t("v.fix")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="accent" size="lg" disabled={busy}><Send /> {busy ? t("saving") : submitLabel}</Button>
            {onCancel && <Button type="button" variant="outline" size="lg" onClick={onCancel}>{t("cancel")}</Button>}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
