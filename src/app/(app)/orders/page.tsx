"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Plus, ShoppingCart, Store } from "lucide-react";
import { CardsSkeleton, EmptyState, PageHeader } from "@/components/common";
import { OrderBadge } from "@/components/OrderBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useOrders } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { ORDER_WAITING_ON } from "@/lib/orders";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const orders = useOrders();

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("orders.title")}
        subtitle={t("orders.intro")}
        actions={
          profile?.role === "supervisor" && (
            <Button asChild variant="accent"><Link href="/orders/new"><Plus /> {t("orders.new")}</Link></Button>
          )
        }
      />
      {!orders.data ? (
        <CardsSkeleton />
      ) : orders.data.length === 0 ? (
        <EmptyState icon={ShoppingCart} text={t("orders.empty")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orders.data.map((o) => {
            const mine = profile && ORDER_WAITING_ON[o.status] === profile.role;
            return (
              <Link key={o.id} href={`/orders/${o.id}`} className="group">
                <Card className={cn("h-full gap-3 py-4 transition group-hover:shadow-md", mine && "border-amber/60 ring-2 ring-amber/25")}>
                  <CardContent className="grid gap-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                        <ShoppingCart className="size-3.5" /> {t("dash.orders")}
                      </span>
                      <OrderBadge status={o.status} />
                    </div>
                    <p className="flex items-center gap-2 font-display text-xl leading-snug font-semibold">
                      <Store className="size-4 shrink-0 text-muted-foreground" /> {o.supplier}
                    </p>
                    <div className="flex items-center gap-x-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatDate(o.createdAt)}</span>
                      <span>{t("orders.itemCount", { n: o.items.length })}</span>
                      <span className="truncate">{o.createdByName}</span>
                      <ChevronRight className="ml-auto size-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
