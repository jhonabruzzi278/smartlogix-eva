import { Boxes, Clock, MapPin, Package, Truck } from "lucide-react";
import { useAuth } from "@/app/auth";
import { getRoleProfile } from "@/app/access";
import { useApiQuery } from "@/hooks/use-api-query";
import { adaptOrder, adaptShipment } from "@/lib/api-adapters";
import type { ApiOrder, ApiShipment } from "@/types/api";
import type { Order, Shipment } from "@/types/domain";

export function ProfilePage() {
  const { session } = useAuth();
  const profile = session ? getRoleProfile(session.role) : null;

  const { data: orders } = useApiQuery<ApiOrder[], Order[]>({
    path: "/api/orders",
    transform: (response) => response.map(adaptOrder)
  });

  const { data: shipments } = useApiQuery<ApiShipment[], Shipment[]>({
    path: "/api/shipments",
    transform: (response) => response.map(adaptShipment)
  });

  if (!session) return null;

  const recentActivity = [
    ...(orders ?? []).slice(0, 2).map((o) => ({
      id: `order-${o.id}`,
      type: "order" as const,
      title: `Pedido #${o.id}`,
      detail: `SKU ${o.sku} - ${o.quantity} unidades - ${o.stage}`,
      time: o.createdAt,
      icon: Package,
      iconBg: "bg-[#4B98CF]"
    })),
    ...(shipments ?? []).slice(0, 2).map((s) => ({
      id: `shipment-${s.id}`,
      type: "shipment" as const,
      title: `Envio ${s.tracking}`,
      detail: `Pedido #${s.orderId} - ${s.stage}`,
      time: s.createdAt,
      icon: Truck,
      iconBg: "bg-[#4EB4A5]"
    }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const initials = session.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      {/* Banner */}
      <div className="-mx-4 -mt-6 sm:-mx-6">
        <div className="relative bg-[#4B98CF]" style={{ minHeight: 140 }}>
          <div className="absolute bottom-0 left-4 right-4 flex items-end gap-4 sm:left-6">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded border-2 border-white bg-[#E3AA75] text-xl font-bold text-white shadow-sm sm:h-24 sm:w-24 sm:text-2xl"
              style={{ transform: "translateY(50%)" }}
            >
              {initials}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <h1 className="text-xl font-bold text-[#112b4a]">{session.name}</h1>
          <p className="text-sm text-[#6B7280]">{session.username}</p>

          <div className="mt-4 space-y-2.5 text-sm text-[#112b4a]">
            <div className="flex items-center gap-2 text-[#6B7280]">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{profile?.label ?? "Usuario"}</span>
            </div>
            <div className="flex items-center gap-2 text-[#6B7280]">
              <Boxes className="h-4 w-4 shrink-0" />
              <span>SmartLogix v2.0</span>
            </div>
            <div className="flex items-center gap-2 text-[#6B7280]">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Entorno local</span>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[#6B7280]">
            {profile?.summary ?? "Perfil operativo de SmartLogix."}
          </p>

          {/* Stats */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between rounded bg-[#F5F7F9] px-3 py-2 text-xs">
              <span className="text-[#6B7280]">Pedidos</span>
              <span className="font-bold text-[#112b4a]">{orders?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-[#F5F7F9] px-3 py-2 text-xs">
              <span className="text-[#6B7280]">Envios</span>
              <span className="font-bold text-[#112b4a]">{shipments?.length ?? 0}</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-[1.2px] text-[#6B7280]">
              Actividad reciente
            </h2>
          </div>

          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="rounded border border-[#DCE0E2] bg-white p-4"
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconBg}`}
                    >
                      <item.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm text-[#112b4a]">{item.title}</strong>
                        <span className="shrink-0 text-xs text-[#6B7280]">
                          {new Date(item.time).toLocaleDateString("es-CL", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#112b4a]/70">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded border border-[#DCE0E2] bg-white p-8 text-center">
                <p className="text-sm text-[#6B7280]">Sin actividad reciente</p>
                <p className="mt-1 text-xs text-[#6B7280]/70">
                  Crea pedidos desde la seccion de ordenes para ver actividad aqui.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
