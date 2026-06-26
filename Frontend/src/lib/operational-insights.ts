import { adaptNotifications } from "@/lib/api-adapters";
import type { ApiNotificationRecord } from "@/types/api";
import type { AlertItem, Order, Product, Shipment, TimelineEvent } from "@/types/domain";

function severityRank(severity: AlertItem["severity"]) {
  switch (severity) {
    case "critical":
      return 3;
    case "high":
      return 2;
    case "medium":
      return 1;
  }
}

function sortAlerts(alerts: AlertItem[]) {
  return alerts
    .slice()
    .sort((left, right) => {
      const bySeverity = severityRank(right.severity) - severityRank(left.severity);
      if (bySeverity !== 0) {
        return bySeverity;
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
}

export function buildOperationalAlerts({
  orders,
  inventory,
  shipments,
  notifications
}: {
  orders: Order[];
  inventory: Product[];
  shipments: Shipment[];
  notifications: ApiNotificationRecord[];
}) {
  const stockAlerts: AlertItem[] = inventory
    .filter((product) => product.stock <= 5)
    .map((product) => ({
      id: `stock-${product.sku}`,
      title: product.stock <= 0 ? `Stock agotado en ${product.sku}` : `Stock bajo en ${product.sku}`,
      description: product.stock <= 0 ? `No hay unidades disponibles para ${product.name}.` : `Quedan ${product.stock} unidades disponibles para ${product.name}.`,
      type: "stock",
      severity: product.stock <= 0 ? "critical" : "high",
      createdAt: product.updatedAt,
      actionLabel: "Revisar inventario"
    }));

  const orderAlerts: AlertItem[] = orders
    .filter((order) => order.stage === "cancelado")
    .map((order) => ({
      id: `order-${order.id}`,
      title: `Pedido ${order.id} cancelado`,
      description: order.cancelReason ?? `El pedido del cliente ${order.customer} fue cancelado.`,
      type: "order",
      severity: "high",
      createdAt: order.createdAt,
      actionLabel: "Ver pedido"
    }));

  const shipmentAlerts: AlertItem[] = shipments
    .filter((shipment) => shipment.stage === "cancelado")
    .map((shipment) => ({
      id: `shipment-${shipment.id}`,
      title: `Envio ${shipment.id} cancelado`,
      description: shipment.exception ?? `El despacho del pedido ${shipment.orderId} fue cancelado.`,
      type: "shipment",
      severity: "medium",
      createdAt: shipment.shippedAt ?? shipment.createdAt,
      actionLabel: "Ver envios"
    }));

  const notificationAlerts: AlertItem[] = (notifications ?? [])
    .filter((record) => {
      const r = record as unknown as Record<string, unknown>;
      const audience = String(r.targetAudience ?? r.target_audience ?? "");
      const status = String(r.status ?? "");
      return audience.toUpperCase() === "OPERATOR" || status.toLowerCase().includes("error") || status.toLowerCase().includes("warn");
    })
    .map((record) => {
      const r = record as unknown as Record<string, unknown>;
      const occurredAt = (r.occurredAt ?? r.occurred_at ?? new Date().toISOString()) as string;
      return {
        id: `notification-${r.id ?? 0}`,
        title: `Notificacion ${r.stage ?? ""}`,
        description: (r.message ?? "") as string,
        type: "notification" as const,
        severity: (String(r.status ?? "").toLowerCase().includes("error") ? "critical" : "high") as AlertItem["severity"],
        createdAt: occurredAt,
        actionLabel: "Revisar detalle"
      };
    });

  return sortAlerts([...stockAlerts, ...orderAlerts, ...shipmentAlerts, ...notificationAlerts]);
}

export function buildOrderTimeline({
  order,
  shipment,
  notifications
}: {
  order: Order | null;
  shipment: Shipment | null;
  notifications: ApiNotificationRecord[];
}) {
  const notificationTimeline = adaptNotifications(notifications);
  if (notificationTimeline.length > 0) {
    return notificationTimeline;
  }

  const timeline: TimelineEvent[] = [];

  if (order) {
    timeline.push({
      id: `${order.id}-created`,
      title: "Pedido recibido",
      detail: `Se registro la orden para ${order.customer} con SKU ${order.sku}.`,
      timestamp: order.createdAt,
      state: "done"
    });

    if (order.stage === "en_preparacion" || order.stage === "en_reparto" || order.stage === "entregado") {
      timeline.push({
        id: `${order.id}-confirmed`,
        title: "Pedido confirmado",
        detail: "El pedido supero la validacion de inventario y se encuentra en preparacion.",
        timestamp: order.createdAt,
        state: "done"
      });
    }

    if (order.stage === "cancelado") {
      timeline.push({
        id: `${order.id}-incident`,
        title: "Incidencia detectada",
        detail: "El flujo del pedido quedo detenido y requiere revision operativa.",
        timestamp: order.createdAt,
        state: "critical"
      });
    }
  }

  if (shipment) {
    timeline.push({
      id: `${shipment.id}-created`,
      title: "Despacho generado",
      detail: `Se creo el despacho para el pedido ${shipment.orderId}.`,
      timestamp: shipment.createdAt,
      state: "done"
    });

    if (shipment.tracking !== "Pendiente") {
      timeline.push({
        id: `${shipment.id}-tracking`,
        title: "Tracking asignado",
        detail: `Codigo de seguimiento ${shipment.tracking}.`,
        timestamp: shipment.shippedAt ?? shipment.createdAt,
        state: shipment.stage === "cancelado" ? "warning" : "done"
      });
    }
  }

  return timeline.sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
}