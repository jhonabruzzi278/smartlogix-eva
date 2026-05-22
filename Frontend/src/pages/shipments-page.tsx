import { useMemo, useState } from "react";
import { Check, Clock, Download, Package, Search, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { usePermissions } from "@/hooks/use-permissions";
import { adaptOrder, adaptShipment } from "@/lib/api-adapters";
import { exportShipmentsCSV } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import type { ApiOrder, ApiShipment } from "@/types/api";
import type { Order, Shipment } from "@/types/domain";

const STEP_LABELS = ["Preparacion", "En reparto", "Entregado"];
const STEP_KEYS = ["label_created,picked_up,hub", "out_for_delivery", "delivered"];

export function ShipmentsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "delayed" | "delivered">("all");
  const { can, role } = usePermissions();
  const canUpdate = can("shipments.update");

  const { data: shipments, loading: sLoading, refresh: refreshShipments } = useApiQuery<ApiShipment[], Shipment[]>({
    path: "/api/shipments", transform: (r) => r.map(adaptShipment)
  });

  useAutoRefresh(() => { if (!sLoading) refreshShipments(); }, 10000);
  const { data: orders } = useApiQuery<ApiOrder[], Order[]>({
    path: "/api/orders", transform: (r) => r.map(adaptOrder)
  });

  const { operationalShipments, updateShipmentStage } = useOperationalWorkspace({ orders, shipments });

  async function handleAdvance(shipment: Shipment, stage: "out_for_delivery" | "delivered" | "delayed") {
    await updateShipmentStage(shipment, stage);
    refreshShipments();
  }

  const filtered = useMemo(() => {
    let list = operationalShipments;
    if (filter === "active") list = list.filter((s) => s.stage !== "delivered" && s.stage !== "delayed");
    if (filter === "delayed") list = list.filter((s) => s.stage === "delayed");
    if (filter === "delivered") list = list.filter((s) => s.stage === "delivered");
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((s) => `${s.tracking} ${s.orderId} ${s.carrier}`.toLowerCase().includes(q));
    }
    return list;
  }, [operationalShipments, filter, query]);

  const counts = useMemo(() => ({
    total: operationalShipments.length,
    active: operationalShipments.filter((s) => s.stage !== "delivered").length,
    delayed: operationalShipments.filter((s) => s.stage === "delayed").length,
    delivered: operationalShipments.filter((s) => s.stage === "delivered").length,
  }), [operationalShipments]);

  function getStepIndex(stage: string) {
    const s = stage.toLowerCase();
    if (s === "delivered") return 2;
    if (s === "out_for_delivery") return 1;
    return 0;
  }

  async function handleAdvance(shipment: Shipment, stage: "out_for_delivery" | "delivered" | "delayed") {
    await updateShipmentStage(shipment, stage);
    refreshShipments();
  }

  return (
    <div className="space-y-4 max-w-sm w-full mx-auto sm:max-w-3xl md:max-w-5xl lg:max-w-7xl xl:max-w-screen-xl px-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[1.2px] text-[#6B7280]">Envios</p>
          <h1 className="text-xl font-bold text-[#112b4a]">
            {role === "shipper" ? "Mis entregas" : "Seguimiento de despachos"}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
          <span>{counts.total} total</span>
          <span className="text-[#4B98CF] font-bold">{counts.active} activos</span>
          <span className="text-red-500 font-bold">{counts.delayed} retrasados</span>
          <button onClick={() => exportShipmentsCSV(operationalShipments.map(s => ({ id: s.id, tracking: s.tracking, orderId: s.orderId, sku: s.sku, stage: String(s.stage), carrier: s.carrier, createdAt: s.createdAt })))} className="flex items-center gap-1 rounded border border-[#DCE0E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#112b4a]">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tracking, pedido, transportista..." className="h-9 w-full rounded border border-[#DDE0E2] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#6B7280]" />
        </div>
        <div className="flex gap-1 rounded border border-[#DCE0E2] bg-white p-0.5">
          {(["all", "active", "delayed", "delivered"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded px-3 py-1 text-[11px] font-semibold transition-colors", filter === f ? "bg-[#4B98CF] text-white" : "text-[#6B7280] hover:text-[#112b4a]")}>
              {f === "all" ? "Todos" : f === "active" ? "Activos" : f === "delayed" ? "Retrasados" : "Entregados"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((shipment) => {
          const step = getStepIndex(shipment.stage);
          return (
            <Link key={shipment.id} to={`/shipments/${shipment.id}`} className="block rounded border border-[#DCE0E2] bg-white p-4 hover:border-[#4B98CF]/40 transition-colors">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    shipment.stage === "delivered" ? "bg-[#4EB4A5]/10" : shipment.stage === "delayed" ? "bg-red-50" : "bg-[#4B98CF]/10"
                  )}>
                    <Truck className={cn(
                      "h-4 w-4",
                      shipment.stage === "delivered" ? "text-[#4EB4A5]" : shipment.stage === "delayed" ? "text-red-500" : "text-[#4B98CF]"
                    )} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#4B98CF] font-mono">{shipment.tracking}</p>
                    <p className="text-xs text-[#6B7280]">Pedido #{shipment.orderId} · SKU {shipment.sku}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                  {/* Timeline steps */}
                  <div className="hidden sm:flex items-center gap-1">
                    {STEP_LABELS.map((label, i) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className={cn(
                          "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors",
                          i < step ? "bg-[#4EB4A5] text-white" :
                          i === step ? (shipment.stage === "delayed" ? "bg-red-500 text-white" : "bg-[#4B98CF] text-white") :
                          "bg-[#F5F7F9] text-[#6B7280]"
                        )}>
                          {i < step ? <Check className="h-3 w-3" /> : i === step ? <Clock className="h-3 w-3" /> : <span>{i + 1}</span>}
                          {label}
                        </div>
                        {i < 2 && <div className={cn("h-0.5 w-4", i < step ? "bg-[#4EB4A5]" : "bg-[#ECEEF0]")} />}
                      </div>
                    ))}
                  </div>

                  {/* Mobile status badge */}
                  <span className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold sm:hidden",
                    shipment.stage === "delivered" ? "bg-green-50 text-green-600" :
                    shipment.stage === "delayed" ? "bg-red-50 text-red-500" :
                    "bg-[#4B98CF]/10 text-[#4B98CF]"
                  )}>
                    {shipment.stage.replace(/_/g, " ")}
                  </span>

                  {canUpdate && shipment.stage !== "delivered" && (
                    <div className="flex items-center gap-1">
                       {!shipment.stage.includes("out") && shipment.stage !== "delayed" && (
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdvance(shipment, "out_for_delivery"); }} className="rounded border border-[#DCE0E2] px-2.5 py-1 text-[10px] font-semibold text-[#4B98CF] hover:bg-[#4B98CF]/5">Reparto</button>
                       )}
                       <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdvance(shipment, "delivered"); }} className="rounded border border-[#DCE0E2] px-2.5 py-1 text-[10px] font-semibold text-[#4EB4A5] hover:bg-[#4EB4A5]/5">Entregado</button>
                       <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdvance(shipment, "delayed"); }} className="rounded border border-[#DCE0E2] px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-50">Retraso</button>
                    </div>
                  )}
                </div>
              </div>

              {shipment.id.startsWith("sched-") && (
                <div className="mt-2 text-[10px] text-purple-500 font-medium">Programado para {new Date(shipment.createdAt).toLocaleDateString("es-CL")}</div>
              )}
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded border border-[#DCE0E2] bg-white py-16">
            <Package className="h-10 w-10 text-[#DCE0E2]" />
            <p className="mt-3 text-sm font-medium text-[#6B7280]">Sin envios</p>
            <p className="mt-1 text-xs text-[#6B7280]/70">Crea pedidos y espera que el sistema genere envios automaticamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
