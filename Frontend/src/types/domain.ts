export type Role = "owner" | "ops" | "warehouse" | "support" | "customer" | "shipper" | "vendor";

export type ProductCategory = "bebidas" | "galletas" | "dulces" | "otros";

export type PaymentMethod = "cash" | "transfer" | "debit" | "credit";

export type HealthState = "healthy" | "warning" | "critical" | "offline";
export type OrderStage = "new" | "confirmed" | "picking" | "packed" | "in_transit" | "delivered" | "incident";
export type ShipmentStage = "label_created" | "picked_up" | "hub" | "out_for_delivery" | "delivered" | "delayed";

export interface Product {
  id: string;
  sku: string;
  name: string;
  stock: number;
  price: number;
  cost: number;
  category: ProductCategory;
  status: HealthState;
  updatedAt: string;
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  state: HealthState | "done";
}

export interface Order {
  id: string;
  customer: string;
  customerId: string;
  source: string;
  stage: OrderStage;
  sku: string;
  quantity: number;
  createdAt: string;
  eta: string | null;
  items: OrderItem[];
  timeline: TimelineEvent[];
  assignedTo?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  createdAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  customerId: string;
  sku: string;
  quantity: number;
  carrier: string;
  tracking: string;
  stage: ShipmentStage;
  eta: string | null;
  createdAt: string;
  shippedAt: string | null;
  exception?: string;
  proofOfDeliveryImage?: string | null;
  recipientRut?: string | null;
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  type: "stock" | "order" | "shipment" | "notification";
  severity: "critical" | "high" | "medium";
  createdAt: string;
  actionLabel: string;
}

export interface SaleItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: PaymentMethod;
  vendorId: string;
  vendorName: string;
  createdAt: string;
}