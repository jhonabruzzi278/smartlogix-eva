import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDefaultPathForRole } from "@/app/access";
import { useAuth } from "@/app/auth";
import { BackendStatusBanner } from "@/components/common/backend-status-banner";
import { PageHeader } from "@/components/common/page-header";
import { StatePanel } from "@/components/common/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { fallbackAlerts } from "@/data/mock-data";
import { useApiQuery, type ApiSource } from "@/hooks/use-api-query";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { usePermissions } from "@/hooks/use-permissions";
import { adaptInventory, adaptOrder, adaptShipment } from "@/lib/api-adapters";
import { buildOperationalAlerts } from "@/lib/operational-insights";
import { formatDate } from "@/lib/utils";
import type { ApiInventory, ApiNotificationRecord, ApiOrder, ApiShipment } from "@/types/api";
import type { AlertItem, Order, Product, Shipment } from "@/types/domain";

export function AlertsPage() {
  const [tab, setTab] = useState("all");
  const navigate = useNavigate();
  const { session } = useAuth();
  const { can } = usePermissions();

  const { data: orders, source: ordersSource, error: ordersError, refresh: refreshOrders } = useApiQuery<ApiOrder[], Order[]>({
    path: "/api/orders",
    transform: (response) => response.map(adaptOrder)
  });

  const { data: inventory, source: inventorySource, error: inventoryError, refresh: refreshInventory } = useApiQuery<ApiInventory[], Product[]>({
    path: "/api/inventory",
    transform: (response) => response.map(adaptInventory)
  });

  const { data: shipments, source: shipmentsSource, error: shipmentsError, refresh: refreshShipments } = useApiQuery<ApiShipment[], Shipment[]>({
    path: "/api/shipments",
    transform: (response) => response.map(adaptShipment)
  });

  const { data: notifications, source: notificationsSource, error: notificationsError, refresh: refreshNotifications } = useApiQuery<ApiNotificationRecord[], ApiNotificationRecord[]>({
    path: "/api/notifications/audience/OPERATOR",
    transform: (response) => response
  });

  const { operationalOrders, operationalInventory, operationalShipments } = useOperationalWorkspace({ orders, inventory, shipments });

  const source: ApiSource = [ordersSource, inventorySource, shipmentsSource, notificationsSource].some((value) => value === "live") ? "live" : "demo";
  const error = [ordersError, inventoryError, shipmentsError, notificationsError].filter(Boolean).join(" | ") || null;

  const alerts = useMemo(() => {
    const derived = buildOperationalAlerts({
      orders: operationalOrders,
      inventory: operationalInventory,
      shipments: operationalShipments,
      notifications
    });
    return derived.length > 0 ? derived : fallbackAlerts;
  }, [notifications, operationalInventory, operationalOrders, operationalShipments]);

  const visibleAlerts = useMemo(() => {
    if (tab === "critical") {
      return alerts.filter((alert) => alert.severity === "critical");
    }
    if (tab === "stock" || tab === "order" || tab === "shipment" || tab === "notification") {
      return alerts.filter((alert) => alert.type === tab);
    }
    return alerts;
  }, [alerts, tab]);

  function refreshAll() {
    refreshOrders();
    refreshInventory();
    refreshShipments();
    refreshNotifications();
  }

  function getAlertTarget(alert: AlertItem) {
    switch (alert.type) {
      case "stock":
        return can("inventory.view") ? "/inventory" : getDefaultPathForRole(session?.role ?? "support");
      case "order":
        return can("orders.view") ? "/orders" : getDefaultPathForRole(session?.role ?? "support");
      case "shipment":
        return can("shipments.view") ? "/shipments" : getDefaultPathForRole(session?.role ?? "support");
      case "notification":
        return "/alerts";
    }
  }

  function getAlertActionLabel(alert: AlertItem) {
    if (alert.type === "stock" && !can("inventory.view")) {
      return "Escalar";
    }
    if (alert.type === "order" && !can("orders.view")) {
      return "Escalar";
    }
    if (alert.type === "shipment" && !can("shipments.view")) {
      return "Escalar";
    }
    return alert.actionLabel;
  }

  function navigateToAlert(alert: AlertItem) {
    navigate(getAlertTarget(alert));
  }

  return (
    <div className="space-y-6">
      <BackendStatusBanner source={source} error={error} entity="Alertas operativas" />

      <PageHeader
        eyebrow="Alertas"
        title="Lo urgente primero"
        description="La cola se recalcula con el estado operativo actual para que la prioridad venga de lo que el equipo ya hizo en pedidos, stock y envios."
        action={<Button variant="secondary" onClick={refreshAll}>Actualizar datos</Button>}
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "all", label: "Todas" },
          { value: "critical", label: "Criticas" },
          { value: "stock", label: "Stock" },
          { value: "order", label: "Pedidos" },
          { value: "shipment", label: "Envios" },
          { value: "notification", label: "Notificaciones" }
        ]}
      />

      {visibleAlerts.length === 0 ? (
        <StatePanel type="empty" title="No hay alertas en esta vista" description="La pestana seleccionada no tiene eventos pendientes en este momento." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Cola de alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleAlerts.map((alert) => (
              <div key={alert.id} className="rounded-[28px] border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{alert.title}</p>
                      <Badge variant={alert.severity === "critical" ? "danger" : alert.severity === "high" ? "warning" : "info"}>{alert.severity}</Badge>
                      <Badge variant="neutral">{alert.type}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{alert.description}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatDate(alert.createdAt)}</p>
                  </div>
                  <Button onClick={() => navigateToAlert(alert)}>{getAlertActionLabel(alert)}</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}