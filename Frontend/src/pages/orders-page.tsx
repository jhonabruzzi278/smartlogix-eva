import { useEffect, useMemo, useState } from "react";
import { Check, Download, FileUp, Plus, RotateCw, Search, Truck, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth";
import { managedUsers } from "@/app/user-directory";
import { orders as fallbackOrders } from "@/data/mock-data";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { usePermissions } from "@/hooks/use-permissions";
import { adaptOrder } from "@/lib/api-adapters";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { exportOrdersCSV } from "@/lib/export-csv";
import { addHistoryEntry } from "@/lib/order-history";
import { cn } from "@/lib/utils";
import type { ApiCreateOrderRequest, ApiCreateOrderResponse, ApiOrder } from "@/types/api";
import type { Order, Role } from "@/types/domain";

const TRANSPORTERS = managedUsers
  .filter((u) => u.role === "shipper")
  .map((u) => ({ username: u.username, name: u.name }));

const ASSIGNMENTS_KEY = "smartlogix-order-transporter-assignments";

function readAssignments(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ASSIGNMENTS_KEY) ?? "{}");
  } catch { return {}; }
}

function saveAssignment(orderId: string, transporter: string) {
  const assignments = readAssignments();
  assignments[orderId] = transporter;
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  window.dispatchEvent(new CustomEvent("smartlogix-transporter-assigned", { detail: { orderId, transporter } }));
}

function getAssignment(orderId: string): string | null {
  return readAssignments()[orderId] ?? null;
}

export function OrdersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [customerId, setCustomerId] = useState("1");
  const [sku, setSku] = useState("100001");
  const [quantity, setQuantity] = useState("1");
  const [transporter, setTransporter] = useState(TRANSPORTERS[0]?.username ?? "");
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>(() => readAssignments());
  const { can, role } = usePermissions();
  const { session } = useAuth();
  const canCreate = can("orders.create");
  const canReview = can("orders.review");

  const { data: orders, loading, refresh } = useApiQuery<ApiOrder[], Order[]>({
    path: "/api/orders", fallbackData: fallbackOrders, transform: (r) => r.map(adaptOrder)
  });

  useAutoRefresh(() => { if (!loading) refresh(); }, 10000);

  const { operationalOrders, validationQueue, validateOrder } = useOperationalWorkspace({ orders });

  const filtered = useMemo(() => {
    let list = operationalOrders;
    if (tab !== "all") list = list.filter((o) => o.stage === tab);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((o) => `${o.id} ${o.customer} ${o.sku} ${assignments[o.id] ?? ""}`.toLowerCase().includes(q));
    }
    return list;
  }, [operationalOrders, tab, query, assignments]);

  const counts = useMemo(() => ({
    total: operationalOrders.length,
    pending: validationQueue.length,
    confirmed: operationalOrders.filter((o) => o.stage === "confirmed").length,
    incident: operationalOrders.filter((o) => o.stage === "incident").length,
  }), [operationalOrders, validationQueue.length]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    try {
      const res = await apiFetch<ApiCreateOrderResponse>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ customerId: Number(customerId), sku: Number(sku), quantity: Number(quantity) } as ApiCreateOrderRequest)
      });
      if (transporter) {
        saveAssignment(String(res.orderId), transporter);
        setAssignments(readAssignments());
      }
      addHistoryEntry({
        orderId: String(res.orderId),
        action: "created",
        actor: session?.name ?? "Admin",
        actorRole: role ?? "owner",
        detail: `Pedido #${res.orderId} creado - Cliente ${customerId}, SKU ${sku}, ${quantity} unids` + (transporter ? ` - Asignado a ${TRANSPORTERS.find(t => t.username === transporter)?.name}` : ""),
      });
      setFeedback({ type: "success", msg: `Pedido #${res.orderId} creado y asignado a transportista` });
      setQuantity("1");
      setShowForm(false);
      refresh();
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof ApiRequestError ? err.message : "Error al crear pedido" });
    } finally { setCreating(false); }
  }

  useEffect(() => {
    const handler = () => setAssignments(readAssignments());
    window.addEventListener("smartlogix-transporter-assigned", handler);
    return () => window.removeEventListener("smartlogix-transporter-assigned", handler);
  }, []);

  useEffect(() => {
    const handler = () => setAssignments(readAssignments());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const getTransporterName = (orderId: string) => {
    const username = assignments[orderId];
    if (!username) return null;
    return TRANSPORTERS.find((t) => t.username === username)?.name ?? username;
  };

  const badgeColor = (stage: string) =>
    stage === "confirmed" ? "bg-[#4EB4A5]/10 text-[#4EB4A5]" :
    stage === "new" ? "bg-[#4B98CF]/10 text-[#4B98CF]" :
    stage === "incident" ? "bg-red-50 text-red-500" :
    stage === "delivered" ? "bg-green-50 text-green-600" : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-4 max-w-md mx-auto sm:max-w-3xl md:max-w-5xl lg:max-w-7xl xl:max-w-screen-xl px-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[1.2px] text-muted-foreground">Pedidos</p>
          <h1 className="text-xl font-bold text-foreground">Gestion de ordenes</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-2 py-0.5">{counts.total} total</span>
          <span className="rounded bg-[#E3AA75]/10 px-2 py-0.5 text-[#E3AA75] font-bold">{counts.pending} por validar</span>
          <span className="rounded bg-[#4EB4A5]/10 px-2 py-0.5 text-[#4EB4A5] font-bold">{counts.confirmed} listos</span>
          {canCreate && (
            <>
              <button onClick={() => setShowForm(!showForm)} className="btn-touch-primary min-h-[40px] gap-1">
                <Plus className="h-4 w-4" /> Nuevo
              </button>
              <button onClick={() => setShowBulk(!showBulk)} className="btn-touch-outline min-h-[40px] gap-1">
                <FileUp className="h-4 w-4" /> CSV
              </button>
            </>
          )}
          <button onClick={() => exportOrdersCSV(operationalOrders.map(o => ({ id: o.id, customer: o.customer, sku: o.sku, quantity: o.quantity, stage: String(o.stage), createdAt: o.createdAt, transporter: getTransporterName(o.id) ?? undefined })))} className="btn-touch-outline min-h-[40px] gap-1">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded border border-border bg-card p-4">
          <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold uppercase tracking-[0.92px] text-muted-foreground mb-1">Cliente ID</label>
              <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-9 w-full rounded border border-input bg-[#F8FBFD] px-3 text-sm" placeholder="1" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold uppercase tracking-[0.92px] text-muted-foreground mb-1">SKU</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} className="h-9 w-full rounded border border-input bg-[#F8FBFD] px-3 text-sm" placeholder="100001" />
            </div>
            <div className="w-20 sm:w-20">
              <label className="block text-[10px] font-bold uppercase tracking-[0.92px] text-muted-foreground mb-1">Cant</label>
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9 w-full rounded border border-input bg-[#F8FBFD] px-3 text-sm text-center" placeholder="1" />
            </div>
            <div className="sm:w-44">
              <label className="block text-[10px] font-bold uppercase tracking-[0.92px] text-muted-foreground mb-1">
                <Truck className="inline h-3 w-3 mr-1" />Transportista
              </label>
              <select value={transporter} onChange={(e) => setTransporter(e.target.value)} className="h-9 w-full rounded border border-input bg-[#F8FBFD] px-2 text-xs">
                {TRANSPORTERS.map((t) => (
                  <option key={t.username} value={t.username}>{t.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={creating} className="h-9 rounded bg-[#4B98CF] px-4 text-xs font-bold text-white hover:bg-[#346384] disabled:opacity-50">
              {creating ? "..." : "Crear"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="h-9 rounded border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted">Cancelar</button>
          </form>
          {feedback && (
            <p className={cn("mt-2 text-xs font-medium", feedback.type === "success" ? "text-[#4EB4A5]" : "text-red-500")}>{feedback.msg}</p>
          )}
        </div>
      )}

      {showBulk && (
        <div className="rounded border border-border bg-card p-4">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-muted-foreground mb-3">Carga masiva CSV</p>
          <p className="text-xs text-muted-foreground mb-2">Formato: customerId,sku,quantity (uno por linea)</p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={"1,100001,3\n2,100002,1\n1,100003,5"}
            rows={5}
            className="w-full rounded border border-input bg-[#F8FBFD] p-3 text-sm font-mono"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={async () => {
                const lines = csvText.trim().split("\n").filter(Boolean);
                let success = 0, errors: string[] = [];
                for (const line of lines) {
                  const [cId, s, q] = line.split(",").map((v) => v.trim());
                  if (!cId || !s || !q) { errors.push("Linea invalida: " + line); continue; }
                  try {
                    await apiFetch<ApiCreateOrderResponse>("/api/orders", {
                      method: "POST",
                      body: JSON.stringify({ customerId: Number(cId), sku: Number(s), quantity: Number(q) })
                    });
                    success++;
                  } catch { errors.push("Fallo: " + line); }
                }
                setBulkFeedback(`${success} pedidos creados.${errors.length ? ` ${errors.length} errores.` : ""}`);
                setCsvText("");
                refresh();
              }}
              className="h-9 rounded bg-[#4B98CF] px-4 text-xs font-bold text-white hover:bg-[#346384]"
            >
              Procesar CSV
            </button>
            <button onClick={() => setShowBulk(false)} className="h-9 rounded border border-border px-3 text-xs font-semibold text-muted-foreground">Cancelar</button>
          </div>
          {bulkFeedback && <p className="mt-2 text-xs text-[#4B98CF]">{bulkFeedback}</p>}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pedido, cliente, SKU..." className="h-10 w-full rounded border border-input bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="flex gap-1 rounded border border-border bg-card p-0.5 overflow-x-auto scroll-x">
          {(["all", "new", "confirmed", "incident", "delivered"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors", tab === t ? "bg-[#4B98CF] text-white" : "text-muted-foreground hover:text-foreground")}>
              {t === "all" ? "Todos" : t === "new" ? "Nuevos" : t === "confirmed" ? "Confirmados" : t === "incident" ? "Incidencias" : "Entregados"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded border border-border bg-card">
        <div className="overflow-x-auto scroll-x">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-bold uppercase tracking-[0.92px] text-muted-foreground">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 w-12 hidden sm:table-cell">Cant</th>
                <th className="px-4 py-3 hidden md:table-cell">Transportista</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 hidden md:table-cell">Creado</th>
                <th className="px-4 py-3 text-right">{canReview ? "Accion" : ""}</th>
              </tr>
            </thead>
          <tbody>
            {filtered.map((order) => {
              const tName = getTransporterName(order.id);
              return (
                <tr key={order.id} className="border-b border-[#F5F7F9] hover:bg-muted cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                  <td className="px-4 py-3 font-bold text-[#4B98CF]">#{order.id}</td>
                  <td className="px-4 py-3 text-foreground">{order.customer}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{order.sku}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">x{order.quantity}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {tName ? (
                      <span className="inline-flex items-center gap-1 text-xs text-foreground">
                        <Truck className="h-3 w-3 text-[#4EB4A5]" />
                        {tName}
                      </span>
                    ) : (
                      <span className="text-xs text-[#DCE0E2]">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold", badgeColor(order.stage))}>
                      {order.stage === "new" ? "Nuevo" : order.stage === "confirmed" ? "Confirmado" : order.stage === "incident" ? "Incidencia" : order.stage === "delivered" ? "Entregado" : order.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(order.createdAt).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                   {canReview && order.stage !== "delivered" && (
                     <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                       <button onClick={() => { validateOrder(order, "approved"); addHistoryEntry({ orderId: order.id, action: "approved", actor: session?.name ?? "Admin", actorRole: role ?? "owner", detail: "Pedido aprobado - listo para despacho" }); }} title="Aprobar" className="inline-flex items-center justify-center rounded-lg border border-border min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] text-green-600 hover:bg-green-50 active:scale-[0.95] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Check className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                       <button onClick={() => { validateOrder(order, "reprocess"); addHistoryEntry({ orderId: order.id, action: "reprocessed", actor: session?.name ?? "Admin", actorRole: role ?? "owner", detail: "Pedido enviado a reproceso" }); }} title="Reprocesar" className="inline-flex items-center justify-center rounded-lg border border-border min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] text-[#E3AA75] hover:bg-amber-50 active:scale-[0.95] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><RotateCw className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                       <button onClick={() => { validateOrder(order, "rejected"); addHistoryEntry({ orderId: order.id, action: "rejected", actor: session?.name ?? "Admin", actorRole: role ?? "owner", detail: "Pedido rechazado - incidencia operativa" }); }} title="Rechazar" className="inline-flex items-center justify-center rounded-lg border border-border min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] text-red-500 hover:bg-red-50 active:scale-[0.95] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                       </div>
                     )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-muted-foreground">Sin pedidos que coincidan</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
