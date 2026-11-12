"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, PackageCheck, Pencil, Send, Store, Undo2, UserRound } from "lucide-react";
import { EmptyState, Field, PageHeader } from "@/components/common";
import { BackBar, InfoGrid } from "@/components/DetailBits";
import { OrderBadge } from "@/components/OrderBadge";
import { OrderForm } from "@/components/OrderForm";
import { PrintHeader } from "@/components/PrintHeader";
import { Timeline } from "@/components/Timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { formatDate, qty } from "@/lib/format";
import { useOrder, useStock } from "@/lib/hooks";
import { errorText, useI18n, type TKey } from "@/lib/i18n";
import { orderActions, orderNoteRequired, performOrderAction, receiveOrder } from "@/lib/orders";
import { receiveLines } from "@/lib/stock";
import type { OrderAction, PurchaseOrder } from "@/lib/types";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { t } = useI18n();
  const o = useOrder(id);
  const [editing, setEditing] = useState(false);

  if (o === undefined) return <Skeleton className="h-96" />;
  if (o === null || !profile) return <EmptyState text={t("detail.notFound")} />;

  if (editing && profile.role === "supervisor" && o.status === "returned")
    return (
      <div className="grid gap-6 [&>*]:min-w-0">
        <PageHeader eyebrow={o.supplier} title={t("orders.edit")} />
        <OrderForm
          initial={o}
          submitLabel={t("orders.saveResend")}
          onCancel={() => setEditing(false)}
          onSubmit={async (data, note) => {
            await performOrderAction(o, profile, "po_resubmit", note, data);
            setEditing(false);
            toast.success(t("did.po_resubmit"));
          }}
        />
      </div>
    );

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <PrintHeader heading={t("orders.title")} />
      <BackBar href="/orders" />
      <PageHeader eyebrow={t("orders.title")} title={o.supplier} subtitle={<OrderBadge status={o.status} className="mt-1" />} />
      <InfoGrid
        items={[
          { Icon: Store, label: t("orders.supplier"), value: o.supplier },
          { Icon: CalendarDays, label: t("supply.date"), value: formatDate(o.createdAt) },
          { Icon: PackageCheck, label: t("orders.items"), value: t("orders.itemCount", { n: o.items.length }) },
          { Icon: UserRound, label: t("detail.createdBy"), value: o.createdByName },
        ]}
      />
      <div className="print-full grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-2xl">{t("orders.items")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("supply.item")}</TableHead>
                  <TableHead className="text-right">{t("supply.qty")}</TableHead>
                  <TableHead>{t("supply.note")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {o.items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{qty(it.qty, it.unit)}</TableCell>
                    <TableCell className="max-w-56 whitespace-normal text-muted-foreground">{it.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="grid content-start gap-6">
          <OrderActions order={o} onEdit={() => setEditing(true)} />
          <Timeline history={o.history} />
        </div>
      </div>
    </div>
  );
}

const ICON: Record<OrderAction, typeof Send> = {
  po_submit: Send,
  po_resubmit: Send,
  po_approve: CheckCircle2,
  po_return: Undo2,
  po_receive: PackageCheck,
};

function OrderActions({ order, onEdit }: { order: PurchaseOrder; onEdit: () => void }) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const stock = useStock();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receiving, setReceiving] = useState(false);
  if (!profile) return null;
  const actions = orderActions(profile.role, order.status);
  if (!actions.length) return null;

  async function run(a: OrderAction) {
    if (!profile) return;
    if (a === "po_resubmit") return onEdit();
    if (a === "po_receive") return setReceiving(true);
    if (orderNoteRequired(a) && !note.trim()) return setError("detail.reasonRequired");
    setBusy(true);
    try {
      await performOrderAction(order, profile, a as "po_approve" | "po_return", note);
      setNote("");
      toast.success(t(`did.${a}` as TKey));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const lines = receiveLines(order.items, stock ?? []);

  return (
    <Card className="no-print border-amber/60 ring-2 ring-amber/30">
      <CardHeader>
        <CardTitle className="font-display text-2xl">{t("detail.yourTurn")}</CardTitle>
        <CardDescription>{t(`order.status.${order.status}` as TKey)}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {actions.some((a) => a !== "po_resubmit") && (
          <Field label={t("detail.reason")} htmlFor="o-action-note" error={error}>
            <Textarea id="o-action-note" rows={3} placeholder={t("detail.notePh")} value={note} aria-invalid={!!error}
              onChange={(e) => { setNote(e.target.value); setError(""); }} />
          </Field>
        )}
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const Icon = a === "po_resubmit" ? Pencil : ICON[a];
            return (
              <Button key={a} disabled={busy} onClick={() => run(a)}
                variant={a === "po_return" ? "outline" : a === "po_approve" ? "default" : "accent"}
                className={a === "po_return" ? "border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive" : ""}>
                <Icon /> {a === "po_resubmit" ? t("orders.edit") : t(`action.${a}` as TKey)}
              </Button>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={receiving} onOpenChange={setReceiving}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t("orders.receiveTitle")}</DialogTitle>
            <DialogDescription>{t("orders.receiveIntro")}</DialogDescription>
          </DialogHeader>
          <ul className="divide-y text-sm">
            {lines.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {l.name}
                  {l.isNew && <Badge variant="secondary" className="ml-2 rounded-full">{t("orders.newItem")}</Badge>}
                </span>
                <span className="font-medium text-leaf-deep tabular-nums">+{qty(l.qty, l.unit)}</span>
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReceiving(false)}>{t("cancel")}</Button>
            <Button variant="accent" disabled={busy || !stock} onClick={async () => {
              setBusy(true);
              try {
                await receiveOrder(order, profile, lines.map(({ itemId, name, unit, qty: q }) => ({ itemId, name, unit, qty: q })), note);
                setReceiving(false);
                toast.success(t("did.po_receive"));
              } catch (e) {
                toast.error(errorText(e));
              } finally {
                setBusy(false);
              }
            }}>
              <PackageCheck /> {t("action.po_receive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
