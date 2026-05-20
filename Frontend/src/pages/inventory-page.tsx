import { useMemo, useState } from "react";
import { Download, Minus, Plus, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { products as fallbackProducts } from "@/data/mock-data";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { usePermissions } from "@/hooks/use-permissions";
import { adaptInventory } from "@/lib/api-adapters";
import { exportInventoryCSV } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import type { ApiInventory } from "@/types/api";
import type { Product } from "@/types/domain";

export function InventoryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "healthy">("all");
  const { can } = usePermissions();
  const canAdjust = can("inventory.adjust");

  const { data: inventory, loading, refresh } = useApiQuery<ApiInventory[], Product[]>({
    path: "/api/inventory", fallbackData: fallbackProducts, transform: (r) => r.map(adaptInventory)
  });

  useAutoRefresh(() => { if (!loading) refresh(); }, 10000);

  const { operationalInventory, adjustInventory } = useOperationalWorkspace({ inventory });

  const filtered = useMemo(() => {
    let list = operationalInventory;
    if (filter !== "all") list = list.filter((p) => p.status === filter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((p) => `${p.sku} ${p.name}`.toLowerCase().includes(q));
    }
    return list;
  }, [operationalInventory, filter, query]);

  const counts = useMemo(() => ({
    total: operationalInventory.length,
    critical: operationalInventory.filter((p) => p.status === "critical").length,
    warning: operationalInventory.filter((p) => p.status === "warning").length,
    totalUnits: operationalInventory.reduce((s, p) => s + p.stock, 0),
  }), [operationalInventory]);

  if (!inventory) return null;

  return (
    <div className="space-y-4 max-w-sm w-full mx-auto sm:max-w-3xl md:max-w-5xl lg:max-w-7xl xl:max-w-screen-xl px-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[1.2px] text-[#939FAD]">Inventario</p>
          <h1 className="text-xl font-bold text-[#112b4a]">Control de stock</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportInventoryCSV(operationalInventory.map(p => ({ sku: String(p.sku), stock: p.stock, status: String(p.status), coverageDays: p.coverageDays, updatedAt: p.updatedAt })))}
            className="flex items-center gap-1 rounded border border-border bg-white px-3 py-1.5 text-xs font-semibold text-[#939FAD] hover:text-[#112b4a]"
          >
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
          <span className="text-xs text-[#939FAD]">{counts.total} SKU · {counts.totalUnits} unids totales</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar SKU..."
            className="h-10 w-full rounded border border-input bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-1 rounded border border-border bg-card p-0.5 overflow-x-auto scroll-x">
          {(["all", "critical", "warning", "healthy"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                filter === f ? "bg-[#4B98CF] text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "Todos" : f === "critical" ? "Critico" : f === "warning" ? "Bajo" : "Estable"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded border border-border bg-card">
        <div className="overflow-x-auto scroll-x">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ECEEF0] text-xs font-bold uppercase tracking-[0.92px] text-muted-foreground">
                <th className="px-4 py-3 w-6"></th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 hidden sm:table-cell">Cobertura</th>
                <th className="px-4 py-3 hidden md:table-cell">Estado</th>
                <th className="px-4 py-3 text-right">{canAdjust ? "Ajuste" : ""}</th>
              </tr>
            </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.sku} className="border-b border-[#F5F7F9] hover:bg-[#F5F7F9] cursor-pointer" onClick={() => navigate(`/inventory/${product.sku}`)}>
                <td className="px-4 py-3">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    product.status === "healthy" && "bg-[#4EB4A5]",
                    product.status === "warning" && "bg-[#E3AA75]",
                    product.status === "critical" && "bg-red-500",
                  )} />
                </td>
                <td className="px-4 py-3 font-bold text-[#4B98CF] hover:underline"><Link to={`/inventory/${product.sku}`} onClick={(e) => e.stopPropagation()}>{product.sku}</Link></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold text-sm", product.stock <= 5 && "text-red-500")}>{product.stock}</span>
                    <div className="hidden w-20 h-1.5 rounded-full bg-[#F5F7F9] sm:block">
                      <div
                        className={cn("h-1.5 rounded-full", product.stock <= 5 ? "bg-red-500" : product.stock <= 20 ? "bg-[#E3AA75]" : "bg-[#4EB4A5]")}
                        style={{ width: `${Math.min(Math.round((product.stock / 100) * 100), 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{product.coverageDays}d</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={cn(
                    "rounded px-2 py-0.5 text-xs font-bold",
                    product.status === "healthy" && "bg-[#4EB4A5]/10 text-[#4EB4A5]",
                    product.status === "warning" && "bg-[#E3AA75]/10 text-[#E3AA75]",
                    product.status === "critical" && "bg-red-50 text-red-500",
                  )}>
                    {product.status === "healthy" ? "Estable" : product.status === "warning" ? "Bajo" : "Critico"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  {canAdjust && (
                    <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                      <button
                        onClick={() => adjustInventory(product, -1, "Reserva manual")}
                        className="inline-flex items-center justify-center rounded-lg border border-border min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] text-red-500 hover:bg-red-50 active:scale-[0.95] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      ><Minus className="h-4 w-4" /></button>
                      <button
                        onClick={() => adjustInventory(product, 1, "Reposicion rapida")}
                        className="inline-flex items-center justify-center rounded-lg border border-border min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] text-green-600 hover:bg-green-50 active:scale-[0.95] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      ><Plus className="h-4 w-4" /></button>
                      <button
                        onClick={() => adjustInventory(product, 5, "Reposicion +5")}
                        className="inline-flex items-center justify-center rounded-lg border border-border min-h-[36px] sm:min-h-[44px] px-2 sm:px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted active:scale-[0.98] bg-card"
                      >+5</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-[#939FAD]">Sin productos que coincidan con el filtro</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
