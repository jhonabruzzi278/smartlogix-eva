import type { ApiCustomer, ApiInventory, ApiNotificationRecord, ApiOrder, ApiShipment } from "@/types/api";
import type { Customer, HealthState, Order, OrderStage, Product, Shipment, ShipmentStage, TimelineEvent } from "@/types/domain";

type StatusMap<T extends string> = readonly (readonly [string, T])[];

const ORDER_STAGE_MAP: StatusMap<OrderStage> = [
  ["preparacion", "en_preparacion"],
  ["EN_PREPARACION", "en_preparacion"],
  ["reparto", "en_reparto"],
  ["EN_REPARTO", "en_reparto"],
  ["entregado", "entregado"],
  ["ENTREGADO", "entregado"],
  ["cancelado", "cancelado"],
  ["CANCELADO", "cancelado"],
  ["cancel", "cancelado"],
  ["reject", "cancelado"]
];

const SHIPMENT_STAGE_MAP: StatusMap<ShipmentStage> = [
  ["preparacion", "en_preparacion"],
  ["EN_PREPARACION", "en_preparacion"],
  ["reparto", "en_reparto"],
  ["EN_REPARTO", "en_reparto"],
  ["entregado", "entregado"],
  ["ENTREGADO", "entregado"],
  ["cancelado", "cancelado"],
  ["CANCELADO", "cancelado"],
  ["cancel", "cancelado"],
  ["deliver", "entregado"]
];

const HEALTH_MAP: StatusMap<HealthState> = [
  ["up", "healthy"],
  ["ok", "healthy"],
  ["healthy", "healthy"],
  ["warn", "warning"],
  ["degrad", "warning"],
  ["offline", "offline"]
];

const normalizeFromMap = <T extends string>(maps: StatusMap<T>, fallback: T) => (status: string): T => {
  const normalized = status.toLowerCase();
  for (const [keyword, stage] of maps) {
    if (normalized.includes(keyword)) return stage;
  }
  return fallback;
};

export const normalizeOrderStage = normalizeFromMap(ORDER_STAGE_MAP, "created");
export const normalizeShipmentStage = normalizeFromMap(SHIPMENT_STAGE_MAP, "en_preparacion");
export const normalizeHealth = normalizeFromMap(HEALTH_MAP, "critical");

export function calculateHealthFromStock(stock: number): HealthState {
  if (stock <= 0) return "critical";
  if (stock <= 5) return "warning";
  return "healthy";
}

export function adaptOrder(apiOrder: ApiOrder, customerName?: string): Order {
  return {
    id: String(apiOrder.id),
    customer: customerName ?? `Cliente #${apiOrder.customerId}`,
    customerId: String(apiOrder.customerId),
    source: "Sincronizacion BD",
    stage: normalizeOrderStage(apiOrder.status),
    sku: String(apiOrder.sku),
    quantity: apiOrder.quantity,
    createdAt: apiOrder.createdAt ?? new Date().toISOString(),
    eta: null,
    items: [
      {
        sku: String(apiOrder.sku),
        name: String(apiOrder.sku),
        quantity: apiOrder.quantity
      }
    ],
    timeline: [],
    assignedTo: apiOrder.assignedTo ?? undefined,
    cancelReason: apiOrder.cancelReason ?? null
  };
}

export function adaptInventory(apiInventory: ApiInventory): Product {
  return {
    id: String(apiInventory.id),
    sku: apiInventory.sku,
    name: apiInventory.name,
    stock: apiInventory.stock,
    price: apiInventory.price,
    cost: apiInventory.cost,
    category: apiInventory.category as Product["category"],
    status: calculateHealthFromStock(apiInventory.stock),
    updatedAt: new Date().toISOString()
  };
}

export function adaptShipment(apiShipment: ApiShipment): Shipment {
  const stage = normalizeShipmentStage(apiShipment.status);
  return {
    id: String(apiShipment.id),
    orderId: String(apiShipment.orderId),
    customerId: String(apiShipment.customerId),
    sku: String(apiShipment.sku),
    quantity: apiShipment.quantity,
    carrier: apiShipment.trackingNumber ? "Transportista asignado" : "Pendiente de asignacion",
    tracking: apiShipment.trackingNumber ?? "Pendiente",
    stage,
    eta: apiShipment.status === 'EN_REPARTO'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : apiShipment.shippedAt ?? apiShipment.createdAt ?? null,
    createdAt: apiShipment.createdAt ?? new Date().toISOString(),
    shippedAt: apiShipment.shippedAt ?? null,
    exception: stage === "cancelado" ? "Envio cancelado" : undefined,
    proofOfDeliveryImage: apiShipment.proofOfDeliveryImage ?? null,
    recipientRut: apiShipment.recipientRut ?? null,
    customerCode: apiShipment.customerCode ?? null
  };
}

export function adaptNotifications(records: ApiNotificationRecord[]): TimelineEvent[] {
  return (records ?? [])
    .slice()
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
    .map((record) => ({
      id: String(record.id),
      title: record.stage,
      detail: `${record.message} | ${record.sourceService}`,
      timestamp: record.occurredAt,
      state: normalizeHealth(record.status)
    }));
}

export function normalizeIntegrationHealth(rawStatus: string): HealthState {
  return normalizeHealth(rawStatus);
}

export function adaptCustomer(apiCustomer: ApiCustomer): Customer {
  return {
    id: String(apiCustomer.id),
    name: apiCustomer.name,
    phone: apiCustomer.phone ?? undefined,
    address: apiCustomer.address ?? undefined,
    email: apiCustomer.email ?? undefined,
    createdAt: apiCustomer.createdAt ?? (apiCustomer as Record<string, unknown>).created_at as string ?? new Date().toISOString()
  };
}
