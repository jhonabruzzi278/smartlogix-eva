import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Check, Clock, Package, Truck, User } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { adaptOrder, adaptShipment } from "@/lib/api-adapters";
import { cn } from "@/lib/utils";
import type { ApiOrder, ApiShipment } from "@/types/api";
import type { Order, Shipment } from "@/types/domain";

const STEP_LABELS = ["Preparacion", "En reparto", "Entregado"];

function getStepIndex(stage: string) {
  const s = stage.toLowerCase();
  if (s === "delivered") return 2;
  if (s === "out_for_delivery") return 1;
  return 0;
}

export function ShipmentDetailPage() {
  const { shipmentId } = useParams();
  const id = Number(shipmentId);

  const { data: shipments, loading } = useApiQuery<ApiShipment[], Shipment[]>({
    path: "/api/shipments", transform: (r) => r.map(adaptShipment)
  });
  const { data: orders } = useApiQuery<ApiOrder[], Order[]>({
    path: "/api/orders", transform: (r) => r.map(adaptOrder)
  });

  const { operationalShipments } = useOperationalWorkspace({ orders, shipments });

  const shipment = useMemo(() => operationalShipments.find((s) => Number(s.id) === id) ?? null, [operationalShipments, id]);

  const customerNames = useMemo(() => {
    const map = new Map<string, string>();
    (orders ?? []).forEach((o) => map.set(String(o.id), o.customer));
    return map;
  }, [orders]);

  const customerName = shipment ? (customerNames.get(shipment.orderId) ?? "Cliente") : "";
  const step = shipment ? getStepIndex(shipment.stage) : 0;

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Package className="h-12 w-12 text-[#DCE0E2]" />
        <p className="mt-4 font-medium text-[#6B7280]">Envio no encontrado</p>
        <Link to="/deliveries" className="mt-2 text-sm text-[#4B98CF] hover:underline">Volver a entregas</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-sm w-full mx-auto sm:max-w-3xl md:max-w-5xl lg:max-w-7xl xl:max-w-screen-xl px-2">
      <Link to="/deliveries" className="inline-flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#112b4a]">
        <ArrowLeft className="h-3.5 w-3.5" /> Entregas
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[1.2px] text-[#6B7280]">Detalle de envio</p>
          <h1 className="text-xl font-bold text-[#112b4a] font-mono">{shipment.tracking}</h1>
          <p className="text-sm text-[#6B7280]">Pedido #{shipment.orderId} · {customerName}</p>
        </div>
        <span className={cn(
          "self-start rounded-full px-3 py-1 text-xs font-bold",
          shipment.stage === "delivered" ? "bg-green-50 text-green-600" :
          shipment.stage === "out_for_delivery" ? "bg-[#4B98CF]/10 text-[#4B98CF]" :
          shipment.stage === "delayed" ? "bg-red-50 text-red-500" :
          "bg-[#ECEEF0] text-[#6B7280]"
        )}>
          {shipment.stage.replace(/_/g, " ")}
        </span>
      </div>

      {/* Progress steps */}
      <div className="rounded border border-[#DCE0E2] bg-white p-5">
        <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#6B7280]">Progreso</p>
        <div className="flex items-center">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center flex-1">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-white text-xs",
                  i < step ? "bg-[#4EB4A5]" : i === step ? "bg-[#4B98CF]" : "bg-[#ECEEF0]"
                )}>
                  {i < step ? <Check className="h-4 w-4" /> : i === step ? <Clock className="h-4 w-4" /> : <span>{i + 1}</span>}
                </div>
                <p className={cn("mt-1.5 text-[10px] font-semibold text-center", i <= step ? "text-[#112b4a]" : "text-[#6B7280]")}>{label}</p>
              </div>
              {i < 2 && <div className={cn("h-0.5 flex-1 -mt-5", i < step ? "bg-[#4EB4A5]" : "bg-[#ECEEF0]")} />}
            </div>
          ))}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-[#DCE0E2] bg-white p-5">
          <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#6B7280]">Informacion</p>
          <div className="space-y-3">
            {[
              { label: "Pedido", value: `#${shipment.orderId}` },
              { label: "SKU", value: shipment.sku },
              { label: "Cantidad", value: `${shipment.quantity} unidad(es)` },
              { label: "Creado", value: new Date(shipment.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded bg-[#F8FAFB] px-4 py-2.5">
                <span className="text-xs text-[#6B7280]">{label}</span>
                <span className="text-sm font-semibold text-[#112b4a]">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-[#DCE0E2] bg-white p-5">
          <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#6B7280]">Despacho</p>
          <div className="space-y-3">
            {[
              { label: "Tracking", value: shipment.tracking, color: "text-[#4B98CF] font-mono" },
              { label: "Transportista", value: shipment.carrier },
              { label: "Salida", value: shipment.shippedAt ? new Date(shipment.shippedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Pendiente" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between rounded bg-[#F8FAFB] px-4 py-2.5">
                <span className="text-xs text-[#6B7280]">{label}</span>
                <span className={cn("text-sm font-semibold text-[#112b4a]", color)}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Proof of delivery */}
      {shipment.stage === "delivered" && (
        <div className="rounded border border-[#DCE0E2] bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-4 w-4 text-[#4EB4A5]" />
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#6B7280]">Prueba de entrega</p>
          </div>

          {shipment.proofOfDeliveryImage && (
            <div className="mb-4">
              <img src={shipment.proofOfDeliveryImage} alt="Prueba de entrega" className="w-full max-h-64 object-contain rounded border border-border bg-[#F8FAFB]" />
            </div>
          )}

          {shipment.recipientRut && (
            <div className="flex items-center gap-3 rounded bg-[#F8FAFB] px-4 py-3">
              <User className="h-4 w-4 text-[#6B7280]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.92px] text-[#6B7280]">RUT de quien recibio</p>
                <p className="text-sm font-semibold text-[#112b4a]">{shipment.recipientRut}</p>
              </div>
            </div>
          )}

          {!shipment.proofOfDeliveryImage && !shipment.recipientRut && (
            <p className="text-xs text-[#6B7280] text-center py-4">Sin prueba de entrega registrada</p>
          )}
        </div>
      )}
    </div>
  );
}
