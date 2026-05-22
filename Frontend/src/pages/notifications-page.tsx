import { useEffect, useState, useMemo } from "react";
import { Clock, FileText, Inbox, Package, Search, Truck, User, X } from "lucide-react";
import { Link } from "react-router-dom";
import { managedUsers } from "@/app/user-directory";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/hooks/use-api-query";
import { adaptOrder, adaptShipment } from "@/lib/api-adapters";
import { cn } from "@/lib/utils";
import type { ApiOrder, ApiShipment } from "@/types/api";
import type { Order, Shipment } from "@/types/domain";

type NotifType = "all" | "order" | "shipment" | "inventory" | "system";

interface NotificationItem {
  id: string;
  type: NotifType;
  icon: typeof Package;
  iconBg: string;
  title: string;
  detail: string;
  link: string;
  time: string;
  read: boolean;
}

const typeFilters: { value: NotifType; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "order", label: "Pedidos" },
  { value: "shipment", label: "Envios" },
  { value: "inventory", label: "Inventario" },
  { value: "system", label: "Sistema" },
];

export function NotificationsPage() {
  const [filter, setFilter] = useState<NotifType>("all");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  const { data: orders } = useApiQuery<ApiOrder[], Order[]>({
    path: "/api/orders",
    transform: (response) => response.map(adaptOrder)
  });

  const { data: shipments } = useApiQuery<ApiShipment[], Shipment[]>({
    path: "/api/shipments",
    transform: (response) => response.map(adaptShipment)
  });

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    (orders ?? []).forEach((o) => {
      items.push({
        id: `ord-${o.id}`,
        type: "order",
        icon: Package,
        iconBg: "bg-[#4B98CF]",
        title: `Pedido #${o.id} creado`,
        detail: `SKU ${o.sku} - ${o.quantity} unids - Estado: ${o.stage}`,
        link: `/orders/${o.id}`,
        time: o.createdAt,
        read: false
      });
    });

    (shipments ?? []).forEach((s) => {
      items.push({
        id: `shp-${s.id}`,
        type: "shipment",
        icon: Truck,
        iconBg: "bg-[#4EB4A5]",
        title: `Envio ${s.tracking}`,
        detail: `Pedido #${s.orderId} - SKU ${s.sku} - ${s.stage}`,
        link: "/shipments",
        time: s.createdAt,
        read: false
      });
    });

    // System notifications
    items.push(
      {
        id: "sys-1",
        type: "system",
        icon: Clock,
        iconBg: "bg-purple-500",
        title: "Sesion iniciada",
        detail: "Tu sesion se inicio correctamente con rol administrador.",
        link: "/profile",
        time: new Date(Date.now() - 60000).toISOString(),
        read: true
      },
      {
        id: "sys-2",
        type: "inventory",
        icon: Package,
        iconBg: "bg-red-500",
        title: "Stock critico",
        detail: "SKU 100004 alcanzo nivel critico: solo 5 unidades disponibles.",
        link: "/inventory/100004",
        time: new Date(Date.now() - 600000).toISOString(),
        read: false
      },
      {
        id: "sys-3",
        type: "system",
        icon: FileText,
        iconBg: "bg-[#6B7280]",
        title: "Backup completado",
        detail: "Respaldo diario de base de datos completado exitosamente.",
        link: "/dashboard",
        time: new Date(Date.now() - 3600000).toISOString(),
        read: false
      }
    );

    // Transporter assignment notifications
    (orders ?? []).filter((o) => o.assignedTo).forEach((order) => {
      const t = managedUsers.find((u) => u.username === order.assignedTo);
      items.push({
        id: `asgn-${order.id}`,
        type: "order",
        icon: Truck,
        iconBg: "bg-[#4EB4A5]",
        title: `Pedido #${order.id} asignado`,
        detail: `Transportista ${t?.name ?? order.assignedTo} asignado al pedido.`,
        link: `/orders/${order.id}`,
        time: new Date(Date.now() - 120000).toISOString(),
        read: true
      });
    });

    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [orders, shipments]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (clearedIds.has(n.id)) return false;
      if (filter !== "all" && n.type !== filter) return false;
      if (criticalOnly && n.type !== "inventory") return false;
      if (search && !`${n.title} ${n.detail}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [notifications, filter, search, clearedIds, criticalOnly]);

  const unreadCount = filtered.filter((n) => !readIds.has(n.id) && !n.read).length;

  function markAsRead(id: string) {
    setReadIds((prev) => new Set([...prev, id]));
  }

  function markAllRead() {
    setReadIds(new Set(filtered.map((n) => n.id)));
  }

  function clearOne(id: string) {
    setClearedIds((prev) => new Set([...prev, id]));
  }

  function clearAll() {
    setClearedIds(new Set(filtered.map((n) => n.id)));
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Ahora";
    if (mins < 60) return `Hace ${mins} min`;
    if (hrs < 24) return `Hace ${hrs}h`;
    if (days === 1) return "Ayer";
    return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#112b4a]">Notificaciones</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            {unreadCount} sin leer de {filtered.length} notificaciones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="rounded border border-[#DCE0E2] px-3 py-1.5 text-xs font-semibold text-[#4B98CF] hover:bg-[#F5F7F9]"
          >
            Marcar todas leidas
          </button>
          <button
            onClick={clearAll}
            className="rounded border border-[#DCE0E2] px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50"
          >
            Limpiar todas
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded border border-[#DCE0E2] bg-white p-0.5 overflow-x-auto scroll-x">
            {typeFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-semibold transition-colors",
                  filter === f.value
                    ? "bg-[#4B98CF] text-white"
                    : "text-[#6B7280] hover:text-[#112b4a]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={cn(
              "rounded border px-3 py-1.5 text-xs font-semibold transition-colors",
              criticalOnly
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-[#DCE0E2] bg-white text-[#6B7280] hover:text-red-500"
            )}
          >
            Solo criticas
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar notificaciones..."
            className="h-9 border-[#DDE0E2] bg-[#F8FBFD] pl-9 text-sm"
          />
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-1">
        {filtered.length > 0 ? (
          filtered.map((n) => (
            <Link
              key={n.id}
              to={n.link}
              onClick={() => markAsRead(n.id)}
              className={cn(
                "flex items-start gap-3 rounded border border-[#DCE0E2] bg-white px-4 py-3 transition hover:bg-[#F5F7F9]",
                !readIds.has(n.id) && !n.read ? "border-l-2 border-l-[#4B98CF]" : ""
              )}
            >
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", n.iconBg)}>
                <n.icon className="h-4 w-4 text-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm", !readIds.has(n.id) && !n.read ? "font-bold text-[#112b4a]" : "text-[#112b4a]")}>
                    {n.title}
                  </p>
                  <span className="shrink-0 text-xs text-[#6B7280]">{formatTime(n.time)}</span>
                </div>
                <p className="mt-0.5 text-xs text-[#6B7280]">{n.detail}</p>
              </div>

              <button
                onClick={(e) => { e.preventDefault(); clearOne(n.id); }}
                className="shrink-0 self-center rounded p-1 text-[#6B7280] hover:bg-[#ECEEF0] hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded border border-[#DCE0E2] bg-white py-16">
            <Inbox className="h-10 w-10 text-[#DCE0E2]" />
            <p className="mt-3 text-sm font-medium text-[#6B7280]">Sin notificaciones</p>
            <p className="mt-1 text-xs text-[#6B7280]/70">No hay notificaciones que coincidan con el filtro actual.</p>
          </div>
        )}
      </div>
    </div>
  );
}
