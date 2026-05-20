import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Box, Check, Clock, History, Package, ShoppingBag, Truck } from "lucide-react";
import { managedUsers } from "@/app/user-directory";
import { orders as fallbackOrders } from "@/data/mock-data";
import { useApiQuery } from "@/hooks/use-api-query";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { adaptOrder, adaptShipment } from "@/lib/api-adapters";
import { buildOrderTimeline } from "@/lib/operational-insights";
import { getOrderHistory } from "@/lib/order-history";
import { cn } from "@/lib/utils";
import type { ApiNotificationRecord, ApiOrder, ApiShipment } from "@/types/api";
import type { Order, Shipment } from "@/types/domain";

const STAGES = ["new", "confirmed", "in_transit", "delivered"];

export function OrderDetailPage() {
  const { orderId } = useParams();
  const fallbackOrder = fallbackOrders.find((item) => item.id === orderId) ?? null;

  const { data: orders } = useApiQuery<ApiOrder[], Order[]>({
    path: "/api/orders", fallbackData: fallbackOrders, transform: (r) => r.map(adaptOrder)
  });
  const { data: shipment } = useApiQuery<ApiShipment, Shipment | null>({
    path: `/api/shipments/${orderId}`, fallbackData: null, transform: adaptShipment, enabled: Boolean(orderId)
  });
  const { data: notificationRecords } = useApiQuery<ApiNotificationRecord[], ApiNotificationRecord[]>({
    path: `/api/notifications/order/${orderId}`, fallbackData: [], transform: (r) => r, enabled: Boolean(orderId)
  });

  const { operationalOrders, operationalShipments } = useOperationalWorkspace({ orders, shipments: shipment ? [shipment] : [] });
  const order = useMemo(() => operationalOrders.find((item) => item.id === orderId) ?? fallbackOrder, [fallbackOrder, operationalOrders, orderId]);
  const operationalShipment = useMemo(() => operationalShipments.find((item) => item.orderId === orderId) ?? null, [operationalShipments, orderId]);
  const historyEntries = useMemo(() => getOrderHistory(orderId ?? ""), [orderId]);

  const transporterName = useMemo(() => {
    try {
      const assignments = JSON.parse(localStorage.getItem("smartlogix-order-transporter-assignments") ?? "{}");
      const username = assignments[orderId ?? ""];
      if (!username) return null;
      const t = managedUsers.find((u) => u.username === username);
      return t?.name ?? username;
    } catch { return null; }
  }, [orderId]);

  const timeline = useMemo(() => buildOrderTimeline({ order, shipment: operationalShipment, notifications: notificationRecords }), [notificationRecords, operationalShipment, order]);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Package className="h-12 w-12 text-[#DCE0E2]" />
        <p className="mt-4 font-medium text-[#939FAD]">Pedido no encontrado</p>
        <Link to="/orders" className="mt-2 text-sm text-[#4B98CF] hover:underline">Volver a pedidos</Link>
      </div>
    );
  }

  const stageIdx = STAGES.findIndex((s) => order.stage.includes(s) || s.includes(order.stage));
  const currentStage = stageIdx >= 0 ? stageIdx : 0;

  const stageColor = (idx: number) =>
    idx < currentStage ? "bg-[#4EB4A5]" :
    idx === currentStage ? (order.stage === "incident" ? "bg-red-500" : "bg-[#4B98CF]") :
    "bg-[#ECEEF0]";

  return (
    <div className="space-y-5">
      <Link to="/orders" className="inline-flex items-center gap-1 text-xs text-[#939FAD] hover:text-[#112b4a]">
        <ArrowLeft className="h-3.5 w-3.5" /> Pedidos
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[1.2px] text-[#939FAD]">Detalle</p>
          <h1 className="text-xl font-bold text-[#112b4a]">Pedido #{order.id}</h1>
          <p className="text-sm text-[#939FAD]">Cliente {order.customer} &middot; {new Date(order.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
          {transporterName && (
            <p className="text-sm text-[#4EB4A5] flex items-center gap-1 mt-0.5">
              <Truck className="h-3.5 w-3.5" />
              Asignado a: {transporterName}
            </p>
          )}
        </div>
        <span className={cn(
          "self-start rounded-full px-3 py-1 text-xs font-bold",
          order.stage === "confirmed" && "bg-[#4EB4A5]/10 text-[#4EB4A5]",
          order.stage === "new" && "bg-[#4B98CF]/10 text-[#4B98CF]",
          order.stage === "incident" && "bg-red-50 text-red-500",
          order.stage === "delivered" && "bg-green-50 text-green-600",
        )}>
          {order.stage === "new" ? "Nuevo" : order.stage === "confirmed" ? "Confirmado" : order.stage === "incident" ? "Incidencia" : order.stage === "delivered" ? "Entregado" : order.stage}
        </span>
      </div>

      {/* Pipeline */}
      <div className="rounded border border-[#DCE0E2] bg-white p-5">
        <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#939FAD]">Progreso del pedido</p>
        <div className="flex items-center">
          {["Recibido", "Confirmado", "En transito", "Entregado"].map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center flex-1">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white text-xs", stageColor(i))}>
                  {i < currentStage ? <Check className="h-4 w-4" /> : i === currentStage ? <Clock className="h-4 w-4" /> : <span>{i + 1}</span>}
                </div>
                <p className={cn("mt-1.5 text-[10px] font-semibold text-center", i <= currentStage ? "text-[#112b4a]" : "text-[#939FAD]")}>{label}</p>
              </div>
              {i < 3 && <div className={cn("h-0.5 flex-1 -mt-5", stageColor(i + 1))} />}
            </div>
          ))}
        </div>
      </div>

      {/* Change history */}
      {historyEntries.length > 0 && (
        <div className="rounded border border-[#DCE0E2] bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-[#939FAD]" />
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#939FAD]">Historial de cambios</p>
          </div>
          <div className="relative pl-6 border-l-2 border-[#ECEEF0] space-y-4">
            {historyEntries.map((entry) => (
              <div key={entry.id} className="relative">
                <div className={cn(
                  "absolute -left-[25px] h-3 w-3 rounded-full border-2 border-white",
                  entry.action === "created" ? "bg-[#4B98CF]" :
                  entry.action === "approved" ? "bg-[#4EB4A5]" :
                  entry.action === "rejected" ? "bg-red-500" :
                  "bg-[#E3AA75]"
                )} />
                <p className="text-xs font-bold text-[#112b4a]">{entry.detail}</p>
                <p className="text-[10px] text-[#939FAD]">
                  {entry.actor} ({entry.actorRole}) &middot; {new Date(entry.timestamp).toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Order info */}
        <div className="rounded border border-[#DCE0E2] bg-white p-5">
          <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#939FAD]">Informacion del pedido</p>
          <div className="space-y-3">
            {[
              { label: "SKU", value: order.sku, icon: Box },
              { label: "Cantidad", value: `${order.quantity} unidad(es)`, icon: ShoppingBag },
              { label: "Origen", value: order.source, icon: ArrowLeft },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded bg-[#F8FAFB] px-4 py-3">
                <Icon className="h-4 w-4 text-[#939FAD]" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.92px] text-[#939FAD]">{label}</p>
                  <p className="text-sm font-semibold text-[#112b4a]">{value}</p>
                </div>
              </div>
            ))}

            <div className="rounded bg-[#F8FAFB] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.92px] text-[#939FAD] mb-2">Items</p>
              {Array.isArray(order.items) && order.items.length > 0 ? (
                order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#ECEEF0] last:border-0">
                    <span className="text-sm text-[#112b4a]">{item.name}</span>
                    <span className="text-xs text-[#939FAD]">SKU {item.sku} x{item.quantity}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-[#112b4a]">Producto {order.sku}</span>
                  <span className="text-xs text-[#939FAD]">x{order.quantity}</span>
                </div>
              )}
            </div>

            {(order as import("@/hooks/use-operational-workspace").OperationalOrder).operationalNote && (
              <div className="rounded border border-[#4B98CF]/20 bg-[#4B98CF]/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.92px] text-[#4B98CF]">Nota operativa</p>
                <p className="mt-1 text-sm text-[#112b4a]">{String((order as import("@/hooks/use-operational-workspace").OperationalOrder).operationalNote)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Shipment + Timeline */}
        <div className="space-y-5">
          {operationalShipment ? (
            <div className="rounded border border-[#DCE0E2] bg-white p-5">
              <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#939FAD]">Despacho</p>
              <div className="space-y-3">
                {[
                  { label: "Tracking", value: operationalShipment.tracking, color: "text-[#4B98CF] font-mono" },
                  { label: "Transportista", value: operationalShipment.carrier },
                  { label: "Estado", value: operationalShipment.stage.replace(/_/g, " ") },
                  { label: "Salida", value: operationalShipment.shippedAt ? new Date(operationalShipment.shippedAt).toLocaleDateString("es-CL") : "Pendiente" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between rounded bg-[#F8FAFB] px-4 py-2.5">
                    <span className="text-xs text-[#939FAD]">{label}</span>
                    <span className={cn("text-sm font-semibold text-[#112b4a]", color)}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded border border-[#DCE0E2] bg-white py-10">
              <Truck className="h-10 w-10 text-[#ECEEF0]" />
              <p className="mt-2 text-sm text-[#939FAD]">Sin despacho asociado</p>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded border border-[#DCE0E2] bg-white p-5">
            <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#939FAD]">Linea de tiempo</p>
            {timeline.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-[#ECEEF0] space-y-4">
                {timeline.map((event: any, i: number) => (
                  <div key={event.id ?? i} className="relative">
                    <div className={cn(
                      "absolute -left-[25px] h-3 w-3 rounded-full border-2 border-white",
                      event.state === "done" ? "bg-[#4EB4A5]" : event.state === "critical" ? "bg-red-500" : "bg-[#E3AA75]"
                    )} />
                    <p className="text-xs font-bold text-[#112b4a]">{event.title}</p>
                    <p className="text-xs text-[#939FAD]">{event.detail}</p>
                    <p className="mt-0.5 text-[10px] text-[#939FAD]">{new Date(event.timestamp).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#939FAD] text-center py-4">Sin eventos registrados aun</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
