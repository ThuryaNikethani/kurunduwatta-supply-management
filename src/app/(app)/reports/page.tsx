"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardCheck, Clock, Hourglass, Soup, Table2, Users } from "lucide-react";
import { CardsSkeleton, EmptyState, PageHeader } from "@/components/common";
import { HorizontalBars, Legend, SERIES_COLORS, StackedColumns } from "@/components/charts";
import { PrintButton, PrintHeader } from "@/components/PrintHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { qty } from "@/lib/format";
import { useSupplyLists, useTransferOuts } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { buildMonthReport, currentMonth, shiftMonth } from "@/lib/reports";

const MONTHS = ["ජනවාරි", "පෙබරවාරි", "මාර්තු", "අප්‍රේල්", "මැයි", "ජූනි", "ජූලි", "අගෝස්තු", "සැප්තැම්බර්", "ඔක්තෝබර්", "නොවැම්බර්", "දෙසැම්බර්"];
const monthName = (m: string) => `${m.slice(0, 4)} ${MONTHS[Number(m.slice(5, 7)) - 1]}`;

export default function ReportsPage() {
  const { t } = useI18n();
  const lists = useSupplyLists();
  const transfers = useTransferOuts();
  const [month, setMonth] = useState(currentMonth);
  const [showTable, setShowTable] = useState(false);

  const r = useMemo(
    () => (lists.data && transfers.data ? buildMonthReport(month, lists.data, transfers.data) : null),
    [month, lists.data, transfers.data],
  );
  const people = r ? r.peopleGuests + r.peopleStaff : 0;
  const series = [
    { key: "guests" as const, label: t("audience.guests"), color: SERIES_COLORS.guests },
    { key: "staff" as const, label: t("audience.staff"), color: SERIES_COLORS.staff },
  ];
  const day = (d: number) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${d}`;

  return (
    <div className="grid gap-6">
      <PrintHeader heading={`${t("reports.title")} · ${monthName(month)}`} />
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.intro")}
        actions={<PrintButton />}
      />

      <div className="no-print flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label={t("reports.prev")} onClick={() => setMonth((m) => shiftMonth(m, -1))}>
          <ChevronLeft />
        </Button>
        <span className="min-w-40 text-center font-display text-xl font-semibold">{monthName(month)}</span>
        <Button variant="outline" size="icon" aria-label={t("reports.next")} disabled={month >= currentMonth()}
          onClick={() => setMonth((m) => shiftMonth(m, 1))}>
          <ChevronRight />
        </Button>
      </div>

      {!r ? (
        <CardsSkeleton count={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile Icon={ClipboardCheck} value={String(r.approvedLists)} label={t("reports.approved")} />
            <Tile Icon={Users} value={String(people)} label={t("reports.people")}
              sub={t("reports.split", { guests: r.peopleGuests, staff: r.peopleStaff })} />
            <Tile Icon={Soup} value={String(r.leftoverPortions)} label={t("reports.leftovers")}
              sub={people ? t("reports.leftoverPct", { pct: r.leftoverPct }) : undefined} />
            <Tile Icon={Clock} value={r.avgApprovalHours === null ? "—" : String(r.avgApprovalHours)} label={t("reports.avgHours")}
              sub={t("reports.waiting", { n: r.waitingNow })} />
          </div>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="font-display text-2xl">{t("reports.perDay")}</CardTitle>
              <Legend items={series} />
            </CardHeader>
            <CardContent className="grid gap-3">
              {people === 0 ? (
                <EmptyState icon={Hourglass} text={t("reports.empty")} />
              ) : (
                <>
                  <StackedColumns rows={r.days} series={series} dayLabel={day} totalLabel={t("reports.total")} />
                  <div className="no-print">
                    <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
                      <Table2 /> {t(showTable ? "reports.hideTable" : "reports.showTable")}
                    </Button>
                  </div>
                  {showTable && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("reports.day")}</TableHead>
                          <TableHead className="text-right">{t("audience.guests")}</TableHead>
                          <TableHead className="text-right">{t("audience.staff")}</TableHead>
                          <TableHead className="text-right">{t("reports.total")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.days.filter((d) => d.guests + d.staff > 0).map((d) => (
                          <TableRow key={d.day}>
                            <TableCell>{day(d.day)}</TableCell>
                            <TableCell className="text-right tabular-nums">{d.guests}</TableCell>
                            <TableCell className="text-right tabular-nums">{d.staff}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">{d.guests + d.staff}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="print-full grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-2xl">{t("reports.topDishes")}</CardTitle>
              </CardHeader>
              <CardContent>
                {r.topDishes.length ? (
                  <HorizontalBars rows={r.topDishes.map((d) => ({ label: d.name, value: d.count }))} color={SERIES_COLORS.guests} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t("dash.empty")}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-2xl">{t("reports.leftoverDishes")}</CardTitle>
              </CardHeader>
              <CardContent>
                {r.leftovers.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("transfer.dish")}</TableHead>
                        <TableHead className="text-right">{t("transfer.portions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.leftovers.map((l) => (
                        <TableRow key={l.dish}>
                          <TableCell>{l.dish}</TableCell>
                          <TableCell className="text-right tabular-nums">{l.portions}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("dash.empty")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("reports.ingredients")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("reports.ingredientsHint")}</p>
            </CardHeader>
            <CardContent>
              {r.ingredients.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("supply.item")}</TableHead>
                      <TableHead className="text-right">{t("supply.qty")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.ingredients.map((i) => (
                      <TableRow key={`${i.name}|${i.unit}`}>
                        <TableCell>{i.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{qty(i.qty, i.unit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">{t("dash.empty")}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Tile({ Icon, value, label, sub }: { Icon: typeof Users; value: string; label: string; sub?: string }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="grid gap-2 px-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-moss">
          <Icon className="size-4" />
        </span>
        <p className="font-display text-3xl leading-none font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
