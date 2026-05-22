import { useCallback, useMemo, useRef, useState } from "react";
import { Camera, Check, Clock, Package, Search, Truck, User, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { usePermissions } from "@/hooks/use-permissions";
import { adaptOrder, adaptShipment } from "@/lib/api-adapters";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ApiOrder, ApiShipment } from "@/types/api";
import type { Order, Shipment } from "@/types/domain";

const STEP_LABELS = ["Preparacion", "En reparto", "Entregado"];

export function ShipperDeliveryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "delivered">("all");
  const [deliveryShipment, setDeliveryShipment] = useState<Shipment | null>(null);
  const [recipientRut, setRecipientRut] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { can, role } = usePermissions();
  const canUpdate = can("shipments.update");
  const isShipper = role === "shipper";

  const { data: shipments, loading: sLoading, refresh: refreshShipments } = useApiQuery<ApiShipment[], Shipment[]>({
    path: "/api/shipments", transform: (r) => r.map(adaptShipment)
  });

  useAutoRefresh(() => { if (!sLoading) refreshShipments(); }, 10000);
  const { data: orders } = useApiQuery<ApiOrder[], Order[]>({
    path: "/api/orders", transform: (r) => r.map(adaptOrder)
  });

  const { operationalShipments, updateShipmentStage } = useOperationalWorkspace({ orders, shipments });

  const customerNames = useMemo(() => {
    const map = new Map<string, string>();
    (orders ?? []).forEach((o) => map.set(String(o.id), o.customer));
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = operationalShipments;
    if (isShipper) list = list.filter((s) => s.stage !== "delivered");
    if (filter === "active") list = list.filter((s) => s.stage !== "delivered" && s.stage !== "delayed");
    if (filter === "delivered") list = list.filter((s) => s.stage === "delivered");
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((s) => `${s.tracking} ${s.orderId} ${s.sku} ${customerNames.get(s.orderId) ?? ""}`.toLowerCase().includes(q));
    }
    return list;
  }, [operationalShipments, isShipper, filter, query, customerNames]);

  const counts = useMemo(() => ({
    total: operationalShipments.length,
    active: operationalShipments.filter((s) => s.stage !== "delivered").length,
    delivered: operationalShipments.filter((s) => s.stage === "delivered").length,
  }), [operationalShipments]);

  function getStepIndex(stage: string) {
    const s = stage.toLowerCase();
    if (s === "delivered") return 2;
    if (s === "out_for_delivery") return 1;
    return 0;
  }

  async function handleAdvance(shipment: Shipment, stage: "out_for_delivery" | "delivered" | "delayed") {
    if (stage === "delivered" && isShipper) {
      setDeliveryShipment(shipment);
      setRecipientRut("");
      setProofImage(null);
      setFeedback(null);
      return;
    }
    await updateShipmentStage(shipment, stage);
    refreshShipments();
  }

  const handleImageCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  function formatRut(value: string) {
    const clean = value.replace(/[^0-9kK]/g, "");
    if (clean.length <= 1) return clean;
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formatted}-${dv}`;
  }

  async function handleConfirmDelivery() {
    if (!deliveryShipment) return;
    if (!recipientRut.trim()) {
      setFeedback({ type: "error", msg: "Ingresa el RUT de quien recibe" });
      return;
    }
    if (!proofImage) {
      setFeedback({ type: "error", msg: "Toma o sube una foto de la entrega" });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await updateShipmentStage(deliveryShipment, "delivered", undefined, {
        proofOfDeliveryImage: proofImage,
        recipientRut: formatRut(recipientRut)
      });
      setFeedback({ type: "success", msg: "Entrega registrada con exito" });
      setTimeout(() => {
        setDeliveryShipment(null);
        refreshShipments();
      }, 1200);
    } catch {
      setFeedback({ type: "error", msg: "Error al registrar la entrega" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-sm w-full mx-auto sm:max-w-3xl md:max-w-5xl lg:max-w-7xl xl:max-w-screen-xl px-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[1.2px] text-[#6B7280]">Despachos</p>
          <h1 className="text-xl font-bold text-[#112b4a]">Mis entregas</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
          <span>{counts.total} total</span>
          <span className="text-[#4B98CF] font-bold">{counts.active} pendientes</span>
          <span className="text-[#4EB4A5] font-bold">{counts.delivered} entregadas</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tracking, pedido, producto..." className="h-9 w-full rounded border border-[#DDE0E2] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#6B7280]" />
        </div>
        {!isShipper && (
          <div className="flex gap-1 rounded border border-[#DCE0E2] bg-white p-0.5">
            {(["all", "active", "delivered"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded px-3 py-1 text-[11px] font-semibold transition-colors", filter === f ? "bg-[#4B98CF] text-white" : "text-[#6B7280] hover:text-[#112b4a]")}>
                {f === "all" ? "Todos" : f === "active" ? "Activos" : "Entregados"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {filtered.map((shipment) => {
          const step = getStepIndex(shipment.stage);
          const customerName = customerNames.get(shipment.orderId) ?? "Cliente";
          return (
            <Link key={shipment.id} to={`/deliveries/${shipment.id}`} className="block rounded border border-[#DCE0E2] bg-white p-4 hover:border-[#4B98CF]/40 transition-colors">
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
                    <p className="text-xs text-[#6B7280]">{customerName} · SKU {shipment.sku} · {shipment.quantity} unids</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
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

                  <span className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold sm:hidden",
                    shipment.stage === "delivered" ? "bg-green-50 text-green-600" :
                    shipment.stage === "delayed" ? "bg-red-50 text-red-500" :
                    "bg-[#4B98CF]/10 text-[#4B98CF]"
                  )}>
                    {shipment.stage.replace(/_/g, " ")}
                  </span>

                  {canUpdate && shipment.stage !== "delivered" && shipment.stage !== "delayed" && (
                    <div className="flex items-center gap-1">
                      {!shipment.stage.includes("out") && (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdvance(shipment, "out_for_delivery"); }} className="rounded border border-[#DCE0E2] px-2.5 py-1 text-[10px] font-semibold text-[#4B98CF] hover:bg-[#4B98CF]/5">Reparto</button>
                      )}
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdvance(shipment, "delivered"); }} className="rounded border border-[#DCE0E2] px-2.5 py-1 text-[10px] font-semibold text-[#4EB4A5] hover:bg-[#4EB4A5]/5">Entregado</button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdvance(shipment, "delayed"); }} className="rounded border border-[#DCE0E2] px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-50">Retraso</button>
                    </div>
                  )}

                  {shipment.stage === "delivered" && shipment.recipientRut && (
                    <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
                      <User className="h-3 w-3" />
                      RUT: {shipment.recipientRut}
                    </div>
                  )}
                </div>
              </div>

              {shipment.proofOfDeliveryImage && (
                <div className="mt-2">
                  <img src={shipment.proofOfDeliveryImage} alt="Prueba de entrega" className="h-16 w-16 rounded object-cover border border-border" />
                </div>
              )}
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded border border-[#DCE0E2] bg-white py-16">
            <Package className="h-10 w-10 text-[#DCE0E2]" />
            <p className="mt-3 text-sm font-medium text-[#6B7280]">Sin entregas pendientes</p>
            <p className="mt-1 text-xs text-[#6B7280]/70">Los pedidos aprobados apareceran aqui automaticamente.</p>
          </div>
        )}
      </div>

      {deliveryShipment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#112b4a]">Confirmar entrega</h2>
              <button onClick={() => setDeliveryShipment(null)} className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4 text-[#6B7280]" />
              </button>
            </div>

            <div className="rounded bg-[#F8FBFD] p-3 mb-4">
              <p className="text-xs font-bold text-[#4B98CF]">{deliveryShipment.tracking}</p>
              <p className="text-xs text-[#6B7280]">Pedido #{deliveryShipment.orderId} · SKU {deliveryShipment.sku} · {deliveryShipment.quantity} unids</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.92px] text-muted-foreground mb-1">RUT de quien recibe</label>
                <input
                  value={recipientRut}
                  onChange={(e) => setRecipientRut(formatRut(e.target.value))}
                  placeholder="12.345.678-9"
                  className="h-9 w-full rounded border border-input bg-white px-3 text-sm"
                  maxLength={12}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.92px] text-muted-foreground mb-1">Foto de entrega</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 h-10 rounded border border-input bg-white text-sm font-medium text-[#6B7280] hover:text-[#112b4a]"
                  >
                    <Camera className="h-4 w-4" />
                    {proofImage ? "Cambiar foto" : "Tomar / Subir foto"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageCapture}
                    className="hidden"
                  />
                </div>
                {proofImage && (
                  <div className="mt-2 relative">
                    <img src={proofImage} alt="Preview" className="w-full h-32 object-cover rounded border border-border" />
                    <button
                      onClick={() => setProofImage(null)}
                      className="absolute top-1 right-1 rounded-full bg-black/50 p-1"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
              </div>

              {feedback && (
                <div className={cn(
                  "rounded px-3 py-2 text-xs font-medium",
                  feedback.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                )}>
                  {feedback.msg}
                </div>
              )}

              <button
                onClick={handleConfirmDelivery}
                disabled={submitting}
                className="w-full h-10 rounded bg-[#4B98CF] text-white text-sm font-bold hover:bg-[#3d85be] disabled:opacity-50"
              >
                {submitting ? "Registrando..." : "Confirmar entrega"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
