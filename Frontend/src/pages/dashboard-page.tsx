import { useMemo, useEffect, useRef, useState } from "react";
import { ArrowRight, Banknote, Boxes, Bell, ShoppingBag, ShoppingCart, Truck, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth";
import { getRoleProfile } from "@/app/access";
import { useApiQuery } from "@/hooks/use-api-query";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useToast } from "@/components/common/toast-provider";
import { adaptInventory, adaptOrder, adaptShipment } from "@/lib/api-adapters";
import { buildOperationalAlerts } from "@/lib/operational-insights";
import { CardSkeleton, ListSkeleton } from "@/components/common/skeleton";
import { ApiErrorBanner } from "@/components/common/api-error-banner";
import { cn, formatCurrency } from "@/lib/utils";
import type { ApiInventory, ApiNotificationRecord, ApiOrder, ApiShipment } from "@/types/api";
import type { AlertItem, Order, Product, Sale, Shipment } from "@/types/domain";

const quickActions = [
  { label: "Nuevo pedido", href: "/orders", icon: ShoppingBag, color: "bg-[#4B98CF]" },
  { label: "Ver inventario", href: "/inventory", icon: Boxes, color: "bg-[#4EB4A5]" },
  { label: "Gestionar envios", href: "/shipments", icon: Truck, color: "bg-[#E3AA75]" },
  { label: "Notificaciones", href: "/notifications", icon: Bell, color: "bg-purple-500" },
];

export function DashboardPage() {
  const { canInstall, promptInstall } = usePwaInstall();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const profile = session ? getRoleProfile(session.role) : null;

  const { data: orders, loading: oLoad, error: oErr, refresh: oRef } = useApiQuery<ApiOrder[], Order[]>({
    path: "/api/orders", transform: (r) => r.map((o) => adaptOrder(o))
  });
  const { data: inventory, loading: iLoad, error: iErr, refresh: iRef } = useApiQuery<ApiInventory[], Product[]>({
    path: "/api/inventory", transform: (r) => r.map(adaptInventory)
  });
  const { data: shipments, loading: sLoad, error: sErr, refresh: sRef } = useApiQuery<ApiShipment[], Shipment[]>({
    path: "/api/shipments", transform: (r) => r.map(adaptShipment)
  });

  const loading = oLoad || iLoad || sLoad;
  const firstError = oErr || iErr || sErr;

  const workspaceInput = useMemo(() => ({
    orders: orders ?? [],
    inventory: inventory ?? [],
    shipments: shipments ?? []
  }), [orders, inventory, shipments]);

  const { operationalOrders, operationalInventory, operationalShipments, stockQueue, getAllSales } = useOperationalWorkspace(workspaceInput);

  const alerts = useMemo<AlertItem[]>(() => {
    return buildOperationalAlerts({ orders: operationalOrders, inventory: operationalInventory, shipments: operationalShipments, notifications: [] });
  }, [operationalInventory, operationalOrders, operationalShipments]);

  const [allSales, setAllSales] = useState<Sale[]>([]);
  const getAllSalesRef = useRef(getAllSales);
  getAllSalesRef.current = getAllSales;

  useEffect(() => {
    getAllSalesRef.current().then(setAllSales).catch(() => setAllSales([]));
  }, []);

  const todaySales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const s = (allSales ?? []).filter((x) => new Date(x.createdAt) >= today);
    return { count: s.length, total: s.reduce((sum, x) => sum + x.total, 0) };
  }, [allSales]);

  const metrics = useMemo(() => ({
    totalOrders: operationalOrders.length,
    activeOrders: operationalOrders.filter((o) => o.stage !== "entregado" && o.stage !== "cancelado").length,
    activeShipments: operationalShipments.filter((s) => s.stage !== "entregado" && s.stage !== "cancelado").length,
    lowStock: stockQueue.length,
    criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
    salesToday: todaySales.total,
    salesCount: todaySales.count,
  }), [operationalOrders, operationalShipments, stockQueue.length, alerts, todaySales]);

  useEffect(() => {
    const critical = alerts.filter((a) => a.severity === "critical");
    if (critical.length > 0 && !loading) {
      addToast({ type: "error", message: `${critical.length} alerta(s) critica(s): ${critical[0].title}`, action: { label: "Ver", href: "/alerts" } });
    }
  }, [alerts.length]);

  if (!session) return null;

  if (loading && !orders && !inventory && !shipments) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-[#112b4a]">Centro operativo</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
        <ListSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-sm w-full mx-auto sm:max-w-3xl md:max-w-5xl lg:max-w-7xl xl:max-w-screen-xl px-2">
      {firstError && <ApiErrorBanner error={firstError} onRetry={() => { oRef(); iRef(); sRef(); }} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[1.2px] text-muted-foreground">Dashboard</p>
          <h1 className="text-xl font-bold text-foreground">
            {session ? `Hola, ${session.name.split(" ")[0]}` : "Centro operativo"}
          </h1>
        </div>
        {canInstall && (
          <button onClick={promptInstall} className="flex items-center gap-1.5 rounded-lg bg-[#4B98CF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#346384]">
            Instalar app
          </button>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Pedidos activos" value={metrics.activeOrders} sub={`${metrics.totalOrders} total`} icon={ShoppingBag} color="bg-[#4B98CF]/10" iconColor="text-[#4B98CF]" />
        <MetricCard label="Envios activos" value={metrics.activeShipments} sub={`${metrics.activeShipments} en ruta`} icon={Truck} color="bg-[#4EB4A5]/10" iconColor="text-[#4EB4A5]" />
        <MetricCard label="Stock bajo" value={metrics.lowStock} sub={metrics.lowStock > 0 ? "Requiere atencion" : "Todo OK"} icon={Boxes} color="bg-[#E3AA75]/10" iconColor="text-[#E3AA75]" />
        <MetricCard label="Ventas hoy" value={formatCurrency(metrics.salesToday)} sub={`${metrics.salesCount} transacciones`} icon={Banknote} color="bg-purple-50" iconColor="text-purple-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-muted-foreground">Pedidos recientes</p>
            <Link to="/orders" className="text-xs text-[#4B98CF] hover:underline flex items-center gap-1">Todos <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="space-y-2">
            {operationalOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded bg-[#F8FAFB] px-3 py-2 cursor-pointer hover:bg-muted" onClick={() => navigate(`/orders/${order.id}`)}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">#{order.id} {order.customer}</p>
                  <p className="text-xs text-muted-foreground">{order.sku} x{order.quantity}</p>
                </div>
                <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold shrink-0",
                  order.stage === "entregado" ? "bg-green-50 text-green-600" :
                  order.stage === "cancelado" ? "bg-red-50 text-red-500" :
                  order.stage === "en_reparto" ? "bg-purple-50 text-purple-600" :
                  order.stage === "en_preparacion" ? "bg-[#E3AA75]/10 text-[#E3AA75]" :
                  "bg-[#4B98CF]/10 text-[#4B98CF]"
                )}>
                  {order.stage === "created" ? "Pendiente" : order.stage === "en_preparacion" ? "Preparacion" : order.stage === "en_reparto" ? "En reparto" : order.stage === "entregado" ? "Entregado" : order.stage === "cancelado" ? "Cancelado" : order.stage}
                </span>
              </div>
            ))}
            {operationalOrders.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sin pedidos registrados</p>}
          </div>
        </div>

        {/* Critical alerts */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-muted-foreground">Alertas</p>
            <Link to="/alerts" className="text-xs text-[#4B98CF] hover:underline flex items-center gap-1">Todas <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <Link key={alert.id} to={alert.actionLabel === "Ver pedido" ? `/orders/${alert.id.replace("order-", "")}` : alert.actionLabel === "Revisar inventario" ? "/inventory" : "/alerts"} className="flex items-start gap-2 rounded bg-[#F8FAFB] px-3 py-2 hover:bg-muted">
                <AlertTriangle className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", alert.severity === "critical" ? "text-red-500" : alert.severity === "high" ? "text-[#E3AA75]" : "text-[#4B98CF]")} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{alert.title}</p>
                  <p className="text-[11px] text-muted-foreground">{alert.description}</p>
                </div>
              </Link>
            ))}
            {alerts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sin alertas activas</p>}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-muted-foreground mb-3">Acciones rapidas</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.href} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 hover:bg-muted transition-colors">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", action.color)}>
                <action.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color, iconColor }: {
  label: string;
  value: string | number;
  sub: string;
  icon: typeof ShoppingBag;
  color: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", color)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px]">{label}</p>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
