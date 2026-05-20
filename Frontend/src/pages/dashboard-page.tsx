import { useMemo, useEffect, useState } from "react";
// Hook para manejar el evento de instalación PWA
function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    function handler(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setCanInstall(false);
    }
  };

  return { canInstall, promptInstall };
}
import { ArrowRight, Boxes, Bell, Clock, Package, ShoppingBag, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth";
import { getRoleProfile } from "@/app/access";
import { fallbackAlerts, orders as fallbackOrders, products as fallbackProducts, shipments as fallbackShipments } from "@/data/mock-data";
import { useApiQuery } from "@/hooks/use-api-query";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { adaptInventory, adaptOrder, adaptShipment } from "@/lib/api-adapters";
import { buildOperationalAlerts } from "@/lib/operational-insights";
import { cn } from "@/lib/utils";
import type { ApiInventory, ApiNotificationRecord, ApiOrder, ApiShipment } from "@/types/api";
import type { AlertItem, Order, Product, Shipment } from "@/types/domain";

const quickActions = [
  { label: "Nuevo pedido", href: "/orders", icon: ShoppingBag, color: "bg-[#4B98CF]" },
  { label: "Ver inventario", href: "/inventory", icon: Boxes, color: "bg-[#4EB4A5]" },
  { label: "Gestionar envios", href: "/shipments", icon: Truck, color: "bg-[#E3AA75]" },
  { label: "Notificaciones", href: "/notifications", icon: Bell, color: "bg-purple-500" },
];

export function DashboardPage() {
  const { canInstall, promptInstall } = usePwaInstallPrompt();
  const { session } = useAuth();
  const navigate = useNavigate();
  const profile = session ? getRoleProfile(session.role) : null;

  const { data: orders, loading: ordersLoading } = useApiQuery<ApiOrder[], Order[]>({
    path: "/api/orders", fallbackData: fallbackOrders, transform: (r) => r.map(adaptOrder)
  });
  const { data: inventory, loading: inventoryLoading } = useApiQuery<ApiInventory[], Product[]>({
    path: "/api/inventory", fallbackData: fallbackProducts, transform: (r) => r.map(adaptInventory)
  });
  const { data: shipments, loading: shipmentsLoading } = useApiQuery<ApiShipment[], Shipment[]>({
    path: "/api/shipments", fallbackData: fallbackShipments, transform: (r) => r.map(adaptShipment)
  });

  const loading = ordersLoading || inventoryLoading || shipmentsLoading;

  const { operationalOrders, operationalInventory, operationalShipments, validationQueue, stockQueue } = useOperationalWorkspace({ orders, inventory, shipments });

  const alerts = useMemo<AlertItem[]>(() => {
    const derived = buildOperationalAlerts({ orders: operationalOrders, inventory: operationalInventory, shipments: operationalShipments, notifications: [] });
    return derived.length > 0 ? derived : fallbackAlerts;
  }, [operationalInventory, operationalOrders, operationalShipments]);

  const metrics = useMemo(() => ({
    totalOrders: operationalOrders.length,
    activeShipments: operationalShipments.filter((s) => s.stage !== "delivered").length,
    lowStock: stockQueue.length,
    criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
  }), [operationalOrders.length, operationalShipments, stockQueue.length, alerts]);

  if (!session) return null;

  if (loading && orders?.length === 0 && inventory?.length === 0 && shipments?.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#4B98CF] border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando centro operativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-md mx-auto sm:max-w-3xl md:max-w-5xl lg:max-w-7xl xl:max-w-screen-xl px-2">
      {/* Botón instalar PWA */}
      {canInstall && (
        <div className="flex justify-center">
          <button
            onClick={promptInstall}
            className="mb-2 rounded bg-[#4B98CF] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#346384]"
          >
            Instalar SmartLogix App
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[1.2px] text-muted-foreground">Don Juan / Bebidas y Confites</p>
          <h1 className="text-xl font-bold text-foreground">Buenos dias, {session.name.split(" ")[0]}</h1>
        </div>
        <span className="rounded-full bg-[#F5F7F9] px-3 py-1 text-xs font-medium text-muted-foreground">
          {profile?.label}
        </span>
      </div>

      {/* Metric cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-muted-foreground">Pedidos totales</p>
            <ShoppingBag className="h-4 w-4 text-[#4B98CF]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{metrics.totalOrders}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{validationQueue.length} por validar</p>
        </div>

        <div className="rounded border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-muted-foreground">Envios activos</p>
            <Truck className="h-4 w-4 text-[#4EB4A5]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{metrics.activeShipments}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">En seguimiento</p>
        </div>

        <div className="rounded border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-muted-foreground">Stock bajo</p>
            <Boxes className="h-4 w-4 text-[#E3AA75]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{metrics.lowStock}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">SKU con cobertura baja</p>
        </div>

        <div className="rounded border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-muted-foreground">Criticas</p>
            <Clock className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{metrics.criticalAlerts}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Alertas criticas activas</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.href}
            className="flex flex-col items-center gap-2 rounded border border-border bg-white py-5 transition active:scale-[0.97] hover:border-[#4B98CF] hover:shadow-sm"
          >
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", action.color)}>
              <action.icon className="h-6 w-6 text-white" />
            </div>
            <span className="text-[11px] font-semibold text-foreground">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Main content: side panel first on mobile, side by side on desktop */}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Inventory + Alerts panel (first on mobile via order-first) */}
        <div className="space-y-5 order-first lg:order-last">
          <div className="rounded border border-border bg-white">
            <div className="flex items-center justify-between border-b border-[#ECEEF0] px-4 py-3">
              <h2 className="text-sm font-bold text-foreground">Estado de inventario</h2>
              <Link to="/inventory" className="flex items-center gap-1 text-xs font-semibold text-[#4B98CF] hover:text-[#346384]">
                Ver <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1 p-3">
              {(inventory ?? []).slice(0, 4).map((product) => (
                <Link
                  key={product.id}
                  to={`/inventory/${product.id}`}
                  className="flex items-center justify-between rounded px-3 py-2 hover:bg-[#F5F7F9]"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      product.status === "healthy" && "bg-[#4EB4A5]",
                      product.status === "warning" && "bg-[#E3AA75]",
                      product.status === "critical" && "bg-red-500",
                    )} />
                    <span className="text-sm font-medium text-foreground">SKU {product.sku}</span>
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    product.stock <= 5 ? "text-red-500" : "text-foreground"
                  )}>
                    {product.stock} unids
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded border border-border bg-white">
            <div className="flex items-center justify-between border-b border-[#ECEEF0] px-4 py-3">
              <h2 className="text-sm font-bold text-foreground">Alertas activas</h2>
              <Link to="/notifications" className="flex items-center gap-1 text-xs font-semibold text-[#4B98CF] hover:text-[#346384]">
                Todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-0.5 p-3">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 rounded px-3 py-2">
                  <div className={cn(
                    "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                    alert.severity === "critical" && "bg-red-500",
                    alert.severity === "high" && "bg-[#E3AA75]",
                    alert.severity === "medium" && "bg-[#4B98CF]"
                  )} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">Sin alertas activas</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent orders (second on mobile, first on desktop) */}
        <div className="rounded border border-border bg-white order-last lg:order-first max-w-sm w-full mx-auto sm:max-w-none">
          <div className="flex items-center justify-between border-b border-[#ECEEF0] px-4 py-3">
            <h2 className="text-sm font-bold text-foreground">Pedidos recientes</h2>
            <Link to="/orders" className="flex items-center gap-1 text-xs font-semibold text-[#4B98CF] hover:text-[#346384]">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto scroll-x">
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#ECEEF0] text-xs font-bold uppercase tracking-[0.92px] text-muted-foreground">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Cant.</th>
                  <th className="px-4 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(operationalOrders.length > 0 ? operationalOrders.slice(0, 6) : orders ?? []).map((order) => (
                  <tr key={order.id} className="border-b border-[#F5F7F9] hover:bg-[#F5F7F9] cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                    <td className="px-4 py-2.5 font-bold text-[#4B98CF]">#{order.id}</td>
                    <td className="px-4 py-2.5 text-foreground">{order.customer}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{order.sku}</td>
                    <td className="px-4 py-2.5 text-foreground">{order.quantity}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "inline-flex rounded px-2 py-0.5 text-xs font-bold",
                        order.stage === "confirmed" && "bg-[#4EB4A5]/10 text-[#4EB4A5]",
                        order.stage === "new" && "bg-[#4B98CF]/10 text-[#4B98CF]",
                        order.stage === "delivered" && "bg-green-50 text-green-600",
                        order.stage === "incident" && "bg-red-50 text-red-500",
                      )}>
                        {order.stage === "new" ? "Nuevo" : order.stage === "confirmed" ? "Confirmado" : order.stage === "incident" ? "Incidencia" : order.stage === "delivered" ? "Entregado" : order.stage}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders?.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">Sin pedidos registrados.</td></tr>
                )}
              </tbody>
            </table>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-[#F5F7F9]">
              {(operationalOrders.length > 0 ? operationalOrders.slice(0, 6) : orders ?? []).map((order) => (
                <div key={order.id} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#F5F7F9]" onClick={() => navigate(`/orders/${order.id}`)}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#4B98CF]">#{order.id}</p>
                    <p className="text-xs text-foreground">{order.customer}</p>
                    <p className="text-[11px] text-muted-foreground">SKU {order.sku} · x{order.quantity}</p>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded px-2 py-0.5 text-xs font-bold",
                    order.stage === "confirmed" && "bg-[#4EB4A5]/10 text-[#4EB4A5]",
                    order.stage === "new" && "bg-[#4B98CF]/10 text-[#4B98CF]",
                    order.stage === "delivered" && "bg-green-50 text-green-600",
                    order.stage === "incident" && "bg-red-50 text-red-500",
                  )}>
                    {order.stage === "new" ? "Nuevo" : order.stage === "confirmed" ? "Confirmado" : order.stage === "incident" ? "Incidencia" : order.stage === "delivered" ? "Entregado" : order.stage}
                  </span>
                </div>
              ))}
              {orders?.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">Sin pedidos registrados.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shipments active */}
      <div className="rounded border border-border bg-white max-w-sm w-full mx-auto sm:max-w-none">
        <div className="flex items-center justify-between border-b border-[#ECEEF0] px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">Envios en curso</h2>
          <Link to="/shipments" className="flex items-center gap-1 text-xs font-semibold text-[#4B98CF] hover:text-[#346384]">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto scroll-x">
          {/* Desktop table */}
          <table className="hidden sm:table w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ECEEF0] text-xs font-bold uppercase tracking-[0.92px] text-muted-foreground">
                <th className="px-4 py-2.5">Tracking</th>
                <th className="px-4 py-2.5">Pedido</th>
                <th className="px-4 py-2.5">SKU</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Transportista</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {operationalShipments.slice(0, 5).map((s) => (
                <tr key={s.id} className="border-b border-[#F5F7F9] hover:bg-[#F5F7F9]">
                  <td className="px-4 py-2.5 font-mono text-xs text-[#4B98CF]">{s.tracking}</td>
                  <td className="px-4 py-2.5 text-foreground">#{s.orderId}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.sku}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "inline-flex rounded px-2 py-0.5 text-xs font-bold",
                      s.stage === "delivered" && "bg-green-50 text-green-600",
                      s.stage === "out_for_delivery" && "bg-[#4B98CF]/10 text-[#4B98CF]",
                      s.stage === "label_created" && "bg-[#E3AA75]/10 text-[#E3AA75]",
                      s.stage === "delayed" && "bg-red-50 text-red-500",
                    )}>
                      {s.stage.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{s.carrier}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(s.createdAt).toLocaleDateString("es-CL")}
                  </td>
                </tr>
              ))}
              {operationalShipments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">Sin envios en curso</td></tr>
              )}
            </tbody>
          </table>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-[#F5F7F9]">
            {operationalShipments.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-bold text-[#4B98CF]">{s.tracking}</p>
                  <p className="text-xs text-foreground">Pedido #{s.orderId} · SKU {s.sku}</p>
                </div>
                <span className={cn(
                  "shrink-0 rounded px-2 py-0.5 text-xs font-bold",
                  s.stage === "delivered" && "bg-green-50 text-green-600",
                  s.stage === "out_for_delivery" && "bg-[#4B98CF]/10 text-[#4B98CF]",
                  s.stage === "label_created" && "bg-[#E3AA75]/10 text-[#E3AA75]",
                  s.stage === "delayed" && "bg-red-50 text-red-500",
                )}>
                  {s.stage.replace(/_/g, " ")}
                </span>
              </div>
            ))}
            {operationalShipments.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Sin envios en curso</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
