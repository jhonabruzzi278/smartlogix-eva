import { useState } from "react";
import { Key, LogIn, Mail } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getDefaultPathForRole, isPathAllowedForRole } from "@/app/access";
import { DEFAULT_DEMO_PASSWORD, getRoleLabel } from "@/lib/user-registry";
import { useAuth } from "@/app/auth";
import { managedUsers } from "@/app/user-directory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const quickAccounts = managedUsers.map((user) => ({
  username: user.username,
  password: DEFAULT_DEMO_PASSWORD,
  roleLabel: getRoleLabel(user.role)
}));

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, login, loading, error } = useAuth();
  const [username, setUsername] = useState("admin@smartlogix.cl");
  const [password, setPassword] = useState(DEFAULT_DEMO_PASSWORD);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string; deniedFrom?: string } | null)?.from;
  const deniedFrom = (location.state as { from?: string; deniedFrom?: string } | null)?.deniedFrom;

  if (session) {
    return <Navigate to={getDefaultPathForRole(session.role)} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const nextSession = await login({ username: username.trim(), password });
      const target = from && isPathAllowedForRole(nextSession.role, from)
        ? from
        : getDefaultPathForRole(nextSession.role);
      navigate(target, { replace: true });
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  const busy = loading || submitting;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1A3142]">
            <span className="text-xl font-bold text-white">S</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">SmartLogix</h1>
          <p className="mt-1 text-sm text-slate-500">Control logistico para PYMEs</p>
        </div>

        <div className="rounded-lg border border-[#DCE0E2] bg-white p-6 shadow-sm">
          {deniedFrom ? (
            <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Sin acceso a <strong>{deniedFrom}</strong>. Usa otro perfil.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <Input
                id="username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@smartlogix.cl"
                autoComplete="username"
                disabled={busy}
                className="h-10 border-[#DDE0E2] bg-[#F8FBFD] pl-9 text-sm placeholder:text-[#6B7280]"
              />
            </div>

            <div className="relative">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contrasena"
                autoComplete="current-password"
                disabled={busy}
                className="h-10 border-[#DDE0E2] bg-[#F8FBFD] pl-9 text-sm placeholder:text-[#6B7280]"
              />
            </div>

            {error ? (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              className="h-10 w-full bg-[#4B98CF] text-sm font-bold hover:bg-[#346384]"
              disabled={busy || !username.trim() || !password.trim()}
            >
              {busy ? (
                "Ingresando..."
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar sesion
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 border-t border-[#ECEEF0] pt-4">
            <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.92px] text-[#6B7280]">
              Acceso rapido
            </p>
            <div className="space-y-1">
              {quickAccounts.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => {
                    setUsername(account.username);
                    setPassword(account.password);
                  }}
                  disabled={busy}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs transition",
                    username === account.username
                      ? "bg-[#4B98CF] text-white"
                      : "bg-[#F5F7F9] text-[#112b4a] hover:bg-[#ECEEF0]"
                  )}
                >
                  <span className="truncate font-medium">{account.username}</span>
                  <span className="ml-2 shrink-0 opacity-70">{account.roleLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[0.75rem] text-[#6B7280]">
          Entorno de desarrollo local &middot; SmartLogix v2.0
        </p>
      </div>
    </div>
  );
}
