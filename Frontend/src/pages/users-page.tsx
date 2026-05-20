import { useMemo, useState } from "react";
import { Check, ChevronDown, Edit2, MoreHorizontal, Search, ShieldCheck, UserPlus, X } from "lucide-react";
import { getRoleProfile } from "@/app/access";
import { getVisibleNavItems } from "@/components/layout/navigation";
import { useAuth } from "@/app/auth";
import { managedUsers } from "@/app/user-directory";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/domain";

const ROLES: Role[] = ["owner", "ops", "warehouse", "support", "customer", "shipper"];

interface UserRow {
  username: string;
  name: string;
  role: Role;
  team: string;
  active: boolean;
  lastLogin: string;
  modules: string[];
}

const DEMO_USERS: UserRow[] = managedUsers.map((u) => ({
  username: u.username,
  name: u.name,
  role: u.role,
  team: u.team,
  active: u.status === "active",
  lastLogin: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
  modules: getVisibleNavItems(u.role).map((m) => m.title),
}));

export function UsersPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserRow[]>(DEMO_USERS);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [showMatrix, setShowMatrix] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "ops" as Role, team: "Operaciones" });
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((u) => `${u.name} ${u.username} ${u.team}`.toLowerCase().includes(q));
    }
    return list;
  }, [users, roleFilter, query]);

  function toggleActive(username: string) {
    setUsers((prev) => prev.map((u) => u.username === username ? { ...u, active: !u.active } : u));
    setFeedback("Estado actualizado");
    setTimeout(() => setFeedback(null), 2000);
  }

  function changeRole(username: string, role: Role) {
    setUsers((prev) => prev.map((u) => u.username === username ? { ...u, role, modules: getVisibleNavItems(role).map((m) => m.title) } : u));
    setEditingUser(null);
    setFeedback("Rol actualizado");
    setTimeout(() => setFeedback(null), 2000);
  }

  function addUser() {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    const entry: UserRow = {
      username: newUser.email.trim().toLowerCase(),
      name: newUser.name.trim(),
      role: newUser.role,
      team: newUser.team,
      active: true,
      lastLogin: new Date().toISOString(),
      modules: getVisibleNavItems(newUser.role).map((m) => m.title),
    };
    setUsers((prev) => [...prev, entry]);
    setNewUser({ name: "", email: "", role: "ops", team: "Operaciones" });
    setShowAdd(false);
    setFeedback("Usuario agregado");
    setTimeout(() => setFeedback(null), 2000);
  }

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const roleBadgeColors: Record<Role, string> = {
    owner: "bg-purple-50 text-purple-600",
    ops: "bg-[#4B98CF]/10 text-[#4B98CF]",
    warehouse: "bg-[#E3AA75]/10 text-[#E3AA75]",
    support: "bg-blue-50 text-blue-600",
    customer: "bg-slate-50 text-slate-500",
    shipper: "bg-green-50 text-green-600",
  };

  const roleInitialColors: Record<Role, string> = {
    owner: "bg-purple-500",
    ops: "bg-[#4B98CF]",
    warehouse: "bg-[#E3AA75]",
    support: "bg-blue-500",
    customer: "bg-slate-500",
    shipper: "bg-green-500",
  };

  return (
    <div className="space-y-4 max-w-md mx-auto sm:max-w-3xl md:max-w-5xl lg:max-w-7xl xl:max-w-screen-xl px-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[1.2px] text-[#939FAD]">Administracion</p>
          <h1 className="text-xl font-bold text-[#112b4a]">Usuarios y roles</h1>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded bg-[#4B98CF] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#346384]"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Agregar usuario
        </button>
      </div>

      {showAdd && (
        <div className="rounded border border-[#DCE0E2] bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-[0.92px] text-[#939FAD] mb-1">Nombre</label>
              <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="h-9 w-full rounded border border-[#DDE0E2] bg-[#F8FBFD] px-3 text-sm" placeholder="Nombre completo" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-[0.92px] text-[#939FAD] mb-1">Email</label>
              <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="h-9 w-full rounded border border-[#DDE0E2] bg-[#F8FBFD] px-3 text-sm" placeholder="usuario@smartlogix.cl" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.92px] text-[#939FAD] mb-1">Rol</label>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })} className="h-9 rounded border border-[#DDE0E2] bg-[#F8FBFD] px-2 text-sm">
                {ROLES.map((r) => <option key={r} value={r}>{getRoleProfile(r).label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={addUser} className="h-9 rounded bg-[#4B98CF] px-4 text-xs font-bold text-white hover:bg-[#346384]">Crear</button>
              <button onClick={() => setShowAdd(false)} className="h-9 rounded border border-[#DCE0E2] px-3 text-xs font-semibold text-[#939FAD] hover:bg-[#F5F7F9]">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#939FAD]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar usuario..." className="h-9 w-full rounded border border-[#DDE0E2] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#939FAD]" />
        </div>
        <div className="flex gap-1 rounded border border-[#DCE0E2] bg-white p-0.5 overflow-x-auto scroll-x">
          <button onClick={() => setRoleFilter("all")} className={cn("rounded px-3 py-1 text-[11px] font-semibold transition-colors", roleFilter === "all" ? "bg-[#4B98CF] text-white" : "text-[#939FAD] hover:text-[#112b4a]")}>Todos</button>
          {ROLES.map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)} className={cn("rounded px-3 py-1 text-[11px] font-semibold transition-colors", roleFilter === r ? "bg-[#4B98CF] text-white" : "text-[#939FAD] hover:text-[#112b4a]")}>{getRoleProfile(r).label}</button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="rounded border border-[#4EB4A5]/30 bg-[#4EB4A5]/5 px-4 py-2 text-xs font-medium text-[#4EB4A5]">{feedback}</div>
      )}


      {/* Vista tipo card en móvil, tabla en sm+ */}
      <div className="rounded border border-[#DCE0E2] bg-white">
        <div className="block sm:hidden">
          {filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-xs text-[#939FAD]">Sin usuarios que coincidan</div>
          )}
          <div className="flex flex-col gap-3 p-3">
            {filtered.map((user) => (
              <div key={user.username} className="rounded border border-[#ECEEF0] bg-[#F8FBFD] p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white", roleInitialColors[user.role])}>
                    {initials(user.name)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#112b4a]">{user.name}</p>
                    <p className="text-xs text-[#939FAD]">{user.username}</p>
                  </div>
                  <button className="rounded p-1 text-[#939FAD] hover:bg-[#F5F7F9]"><MoreHorizontal className="h-4 w-4" /></button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-[#939FAD]">
                  <span className="font-semibold text-[#4B98CF]">{getRoleProfile(user.role).label}</span>
                  <span>{user.team}</span>
                  <span>{new Date(user.lastLogin).toLocaleDateString("es-CL")}</span>
                  <span>{user.active ? "Activo" : "Inactivo"}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.modules.slice(0, 3).map((m) => (
                    <span key={m} className="rounded bg-[#E3AA75]/10 px-2 py-0.5 text-[10px] text-[#E3AA75]">{m}</span>
                  ))}
                  {user.modules.length > 3 && <span className="text-[10px] text-[#939FAD]">+{user.modules.length - 3}</span>}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setEditingUser(user.username)}
                    className={cn("inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold group border border-[#4B98CF] text-[#4B98CF]", editingUser === user.username && "bg-[#4B98CF]/10")}
                  >
                    Editar rol
                  </button>
                  <button
                    onClick={() => toggleActive(user.username)}
                    className={cn(
                      "flex h-7 w-12 rounded-full transition-colors p-0.5 border border-[#ECEEF0]",
                      user.active ? "bg-[#4EB4A5]/20" : "bg-[#ECEEF0]"
                    )}
                  >
                    <div className={cn("h-6 w-6 rounded-full bg-white shadow transition-transform", user.active ? "translate-x-5" : "")} />
                  </button>
                </div>
                {editingUser === user.username && (
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.username, e.target.value as Role)}
                      className="h-8 rounded border border-[#DDE0E2] bg-[#F8FBFD] px-2 text-xs"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{getRoleProfile(r).label}</option>)}
                    </select>
                    <button onClick={() => setEditingUser(null)} className="p-1 text-[#939FAD] hover:text-[#112b4a]"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Tabla para sm+ */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ECEEF0] text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#939FAD]">
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3 hidden sm:table-cell">Equipo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3 w-20">Activo</th>
                <th className="px-4 py-3 hidden md:table-cell">Ultimo acceso</th>
                <th className="px-4 py-3 hidden lg:table-cell">Modulos</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.username} className="border-b border-[#F5F7F9] hover:bg-[#F5F7F9]">
                  <td className="px-4 py-3">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white", roleInitialColors[user.role])}>
                      {initials(user.name)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#112b4a]">{user.name}</p>
                    <p className="text-xs text-[#939FAD]">{user.username}</p>
                  </td>
                  <td className="px-4 py-3 text-[#939FAD] hidden sm:table-cell">{user.team}</td>
                  <td className="px-4 py-3">
                    {editingUser === user.username ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={user.role}
                          onChange={(e) => changeRole(user.username, e.target.value as Role)}
                          className="h-8 rounded border border-[#DDE0E2] bg-[#F8FBFD] px-2 text-xs"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{getRoleProfile(r).label}</option>)}
                        </select>
                        <button onClick={() => setEditingUser(null)} className="p-1 text-[#939FAD] hover:text-[#112b4a]"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingUser(user.username)}
                        className={cn("inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold group", roleBadgeColors[user.role])}
                      >
                        {getRoleProfile(user.role).label}
                        <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(user.username)}
                      className={cn(
                        "flex h-6 w-10 rounded-full transition-colors p-0.5",
                        user.active ? "bg-[#4EB4A5]" : "bg-[#ECEEF0]"
                      )}
                    >
                      <div className={cn("h-5 w-5 rounded-full bg-white shadow transition-transform", user.active ? "translate-x-4" : "")} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#939FAD] hidden md:table-cell">
                    {new Date(user.lastLogin).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {user.modules.slice(0, 3).map((m) => (
                        <span key={m} className="rounded bg-[#F5F7F9] px-1.5 py-0.5 text-[10px] text-[#939FAD]">{m}</span>
                      ))}
                      {user.modules.length > 3 && <span className="text-[10px] text-[#939FAD]">+{user.modules.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="rounded p-1 text-[#939FAD] hover:bg-[#F5F7F9]"><MoreHorizontal className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-[#939FAD]">Sin usuarios que coincidan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission matrix */}
      <div className="rounded border border-[#DCE0E2] bg-white">
        <button onClick={() => setShowMatrix(!showMatrix)} className="flex w-full items-center justify-between px-4 py-3 text-left">
          <h2 className="text-sm font-bold text-[#112b4a]">Matriz de permisos por rol</h2>
          <ChevronDown className={cn("h-4 w-4 text-[#939FAD] transition-transform", showMatrix && "rotate-180")} />
        </button>
        {showMatrix && (
          <div className="overflow-x-auto border-t border-[#ECEEF0] p-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#ECEEF0]">
                  <th className="py-2 pr-4 font-bold text-[#112b4a] text-left">Permiso</th>
                  {ROLES.map((r) => (
                    <th key={r} className="py-2 px-3 text-center font-bold text-[#112b4a]">
                      {getRoleProfile(r).label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { perm: "Ver dashboard", key: "dashboard.view" },
                  { perm: "Ver inventario", key: "inventory.view" },
                  { perm: "Ajustar inventario", key: "inventory.adjust" },
                  { perm: "Ver pedidos", key: "orders.view" },
                  { perm: "Crear pedidos", key: "orders.create" },
                  { perm: "Validar pedidos", key: "orders.review" },
                  { perm: "Ver envios", key: "shipments.view" },
                  { perm: "Gestionar envios", key: "shipments.update" },
                  { perm: "Crear despachos", key: "shipments.dispatch" },
                  { perm: "Ver alertas", key: "alerts.view" },
                  { perm: "Ver usuarios", key: "users.view" },
                  { perm: "Gestionar usuarios", key: "users.manage" },
                ].map(({ perm, key }) => (
                  <tr key={key} className="border-b border-[#F5F7F9]">
                    <td className="py-2 pr-4 font-medium text-[#112b4a]">{perm}</td>
                    {ROLES.map((r) => {
                      const has = getRoleProfile(r).permissions.includes(key as any);
                      return (
                        <td key={r} className="py-2 px-3 text-center">
                          {has ? (
                            <Check className="mx-auto h-4 w-4 text-[#4EB4A5]" />
                          ) : (
                            <span className="text-[#DCE0E2]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
