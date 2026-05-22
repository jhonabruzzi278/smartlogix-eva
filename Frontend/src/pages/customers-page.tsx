import { useMemo, useState } from "react";
import { Download, Pencil, Plus, Search, Trash2, User, UserPlus } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { adaptCustomer } from "@/lib/api-adapters";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiCustomer } from "@/types/api";
import type { Customer } from "@/types/domain";
import { apiFetch, ApiRequestError } from "@/lib/api-client";

export function CustomersPage() {
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", email: "" });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: customers, loading, refresh } = useApiQuery<ApiCustomer[], Customer[]>({
    path: "/api/customers", transform: (r) => r.map(adaptCustomer)
  });

  useAutoRefresh(() => { if (!loading) refresh(); }, 15000);

  const filtered = useMemo(() => {
    if (!customers) return [];
    let list = customers;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((c) => `${c.name} ${c.phone ?? ""} ${c.address ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q));
    }
    return list;
  }, [customers, query]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) { setFormError("El nombre es obligatorio"); return; }

    setCreating(true);
    try {
      if (editCustomer) {
        await apiFetch(`/api/customers/${editCustomer.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: form.name, phone: form.phone, address: form.address, email: form.email })
        });
      } else {
        await apiFetch("/api/customers", {
          method: "POST",
          body: JSON.stringify({ name: form.name, phone: form.phone, address: form.address, email: form.email })
        });
      }
      setForm({ name: "", phone: "", address: "", email: "" });
      setEditCustomer(null);
      setDialogOpen(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Error al guardar");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(c: Customer) {
    setEditCustomer(c);
    setForm({ name: c.name, phone: c.phone ?? "", address: c.address ?? "", email: c.email ?? "" });
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return;
    await apiFetch(`/api/customers/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-4 max-w-sm w-full mx-auto sm:max-w-3xl md:max-w-5xl lg:max-w-7xl xl:max-w-screen-xl px-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[1.2px] text-[#6B7280]">Clientes</p>
          <h1 className="text-xl font-bold text-[#112b4a]">Gestion de clientes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setFormError(""); setEditCustomer(null); setForm({ name: "", phone: "", address: "", email: "" }); } }}>
            <DialogTrigger render={<Button className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold bg-[#4B98CF] hover:bg-[#346384] text-white"><UserPlus className="h-3.5 w-3.5" />Nuevo cliente</Button>} />
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>{editCustomer ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.92px] text-[#6B7280]">Nombre *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bar El Rincon" className="h-9 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.92px] text-[#6B7280]">Telefono</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+56912345678" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.92px] text-[#6B7280]">Email</label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contacto@email.cl" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.92px] text-[#6B7280]">Direccion</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Av. Libertador 1234" className="h-9 text-sm" />
                </div>
                {formError && <p className="text-xs text-red-500">{formError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditCustomer(null); }}>Cancelar</Button>
                  <Button type="submit" size="sm" className="bg-[#4B98CF] hover:bg-[#346384] text-white" disabled={creating}>{creating ? "Guardando..." : "Guardar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <span className="text-xs text-[#6B7280]">{filtered.length} clientes</span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, telefono, direccion..."
          className="h-10 w-full rounded border border-input bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((customer) => (
          <div key={customer.id} className="rounded border border-[#DCE0E2] bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4B98CF]/10">
                <User className="h-5 w-5 text-[#4B98CF]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#112b4a]">{customer.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#6B7280] mt-0.5">
                  {customer.phone && <span>{customer.phone}</span>}
                  {customer.email && <span>{customer.email}</span>}
                  {customer.address && <span className="truncate">{customer.address}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(customer)} className="inline-flex items-center justify-center rounded-lg border border-border min-h-[36px] min-w-[36px] text-[#4B98CF] hover:bg-[#4B98CF]/5 active:scale-[0.95] transition-colors" title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(customer.id)} className="inline-flex items-center justify-center rounded-lg border border-border min-h-[36px] min-w-[36px] text-red-400 hover:bg-red-50 hover:text-red-600 active:scale-[0.95] transition-colors" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded border border-[#DCE0E2] bg-white py-16">
            <User className="h-10 w-10 text-[#DCE0E2]" />
            <p className="mt-3 text-sm font-medium text-[#6B7280]">Sin clientes</p>
            <p className="mt-1 text-xs text-[#6B7280]/70">Agrega tu primer cliente para comenzar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
