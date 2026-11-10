"use client";

import Link from "next/link";
import { PackageCheck, PackageMinus, ShoppingCart, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { backend } from "@/lib/backend";
import { formatDateTime, qty } from "@/lib/format";
import { useStock, useStockIssue } from "@/lib/hooks";
import { errorText, useI18n } from "@/lib/i18n";
import { issueLines, previewIssue, shortagesAfterIssue } from "@/lib/stock";
import type { SupplyList } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Take an approved supply list out of stock (supervisor/HR), once. */
export function StockIssuePanel({ supply }: { supply: SupplyList }) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const stock = useStock();
  const issue = useStockIssue(supply.id);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const canIssue = profile?.role === "supervisor" || profile?.role === "hr";

  if (issue === undefined || !stock) return <Skeleton className="h-40" />;

  if (issue) {
    const stillShort = shortagesAfterIssue(supply.items, issue);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl">
            <PackageCheck className="size-5 text-leaf-deep" /> {t("issue.done")}
          </CardTitle>
          <CardDescription>{t("issue.doneBy", { name: issue.byName, time: formatDateTime(issue.createdAt) })}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {issue.lines.map((l, i) => (
              <li key={i}>{l.name} −{qty(l.qty, l.unit)}</li>
            ))}
          </ul>
          {stillShort.length > 0 && (
            <div className="mt-4 grid gap-2 rounded-xl border border-amber/60 bg-amber/10 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <TriangleAlert className="size-4 text-amber-deep" /> {t("issue.shortTitle", { n: stillShort.length })}
              </p>
              <p className="text-muted-foreground">{stillShort.map((s) => `${s.name} ${qty(s.qty, s.unit)}`).join(" · ")}</p>
              {profile?.role === "supervisor" && (
                <div className="no-print">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/orders/new?supply=${supply.id}`}><ShoppingCart /> {t("issue.orderShort")}</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!canIssue)
    return (
      <Card className="py-4">
        <CardContent className="flex items-center gap-3 px-4 text-sm text-muted-foreground">
          <PackageMinus className="size-5" /> {t("issue.waiting")}
        </CardContent>
      </Card>
    );

  const rows = previewIssue(supply.items, stock);
  const short = rows.filter((r) => r.short > 0);
  const lines = issueLines(rows);

  async function issueNow() {
    setBusy(true);
    try {
      await backend.issueSupply(supply.id, lines);
      toast.success(t("issue.done"));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="no-print border-amber/60 ring-2 ring-amber/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl">
          <PackageMinus className="size-5" /> {t("issue.title")}
        </CardTitle>
        <CardDescription>{t("issue.intro")}</CardDescription>
        <CardAction>
          <Button variant="accent" disabled={busy || !lines.length} onClick={() => setConfirm(true)}>
            <PackageMinus /> {t("issue.button")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("supply.item")}</TableHead>
              <TableHead className="text-right">{t("issue.need")}</TableHead>
              <TableHead className="text-right">{t("issue.inStock")}</TableHead>
              <TableHead className="text-right">{t("issue.give")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i} className={cn(r.short > 0 && "bg-amber/10 hover:bg-amber/15")}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(r.need, r.unit)}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {r.item ? qty(r.item.qty, r.item.unit) : t("issue.notInStock")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {qty(r.give, r.unit)}
                  {r.short > 0 && <span className="block text-xs text-amber-deep">{t("issue.short")} {qty(r.short, r.unit)}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {short.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber/60 bg-amber/10 p-3 text-sm sm:flex-row sm:items-center">
            <TriangleAlert className="size-5 shrink-0 text-amber-deep" />
            <p className="flex-1">{t("issue.shortTitle", { n: short.length })}</p>
            {profile?.role === "supervisor" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/orders/new?supply=${supply.id}`}><ShoppingCart /> {t("issue.orderShort")}</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("issue.button")}</AlertDialogTitle>
            <AlertDialogDescription>{t("issue.confirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={issueNow}>{t("confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
