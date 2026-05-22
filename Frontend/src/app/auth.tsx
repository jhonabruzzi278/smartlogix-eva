import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getDefaultPathForRole, isPathAllowedForRole } from "@/app/access";
import { readApiConfig, writeApiConfig } from "@/lib/api-config";
import { setApiAuthErrorListener, setApiAuthRefreshHandler } from "@/lib/api-client";
import { decodeJwtPayload, globalSignOut, loginWithCognitoOrDemo, refreshCognitoSession, type CognitoAuthResult } from "@/lib/cognito-auth";
import type { ApiLoginRequest } from "@/types/api";
import type { Role } from "@/types/domain";

interface Session {
  role: Role;
  name: string;
  username: string;
  backendRoles: string[];
  token: string;
  idToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  issuedAt: number;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (credentials: ApiLoginRequest) => Promise<Session>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = "smartlogix-auth-session";
const AuthContext = createContext<AuthContextValue | null>(null);

function mapBackendRolesToAppRole(roles: string[]): Role {
  const normalized = roles.map((role) => role.toLowerCase());

  const hasRole = (terms: string[]) =>
    normalized.some((role) => terms.some((term) => role === term || role.includes(term)));

  if (hasRole(["admin", "owner"])) return "owner";
  if (hasRole(["operador", "ops", "operation"])) return "ops";
  if (hasRole(["transportista", "shipper", "carrier"])) return "shipper";
  if (hasRole(["cliente", "customer"])) return "customer";
  if (hasRole(["soporte", "support"])) return "support";
  if (hasRole(["bodega", "warehouse"])) return "warehouse";
  if (hasRole(["vendedor", "vendor"])) return "vendor";

  return "customer";
}

function isSessionExpired(session: Session) {
  if (!session.expiresIn || session.expiresIn <= 0) {
    return true;
  }

  if (!session.issuedAt || session.issuedAt <= 0) {
    return true;
  }

  return Date.now() >= session.issuedAt + session.expiresIn * 1000;
}

function extractRolesFromPayload(payload: Record<string, unknown>) {
  const groups = payload["cognito:groups"];
  if (!Array.isArray(groups)) {
    return [] as string[];
  }

  return groups.filter((value): value is string => typeof value === "string");
}

function normalizeStoredSession(parsed: Partial<Session>): Session | null {
  if (
    typeof parsed.role !== "string" ||
    typeof parsed.name !== "string" ||
    typeof parsed.username !== "string" ||
    !Array.isArray(parsed.backendRoles) ||
    typeof parsed.token !== "string" ||
    typeof parsed.expiresIn !== "number" ||
    typeof parsed.issuedAt !== "number"
  ) {
    return null;
  }

  return {
    role: parsed.role as Role,
    name: parsed.name,
    username: parsed.username,
    backendRoles: parsed.backendRoles.filter((value): value is string => typeof value === "string"),
    token: parsed.token,
    idToken: typeof parsed.idToken === "string" ? parsed.idToken : "",
    refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : "",
    tokenType: typeof parsed.tokenType === "string" ? parsed.tokenType : "Bearer",
    expiresIn: parsed.expiresIn,
    issuedAt: parsed.issuedAt
  };
}

function buildSessionFromAuth(username: string, auth: CognitoAuthResult, previousSession?: Session): Session {
  const idTokenPayload = decodeJwtPayload(auth.idToken);
  const accessTokenPayload = decodeJwtPayload(auth.accessToken);
  const tokenRoles = extractRolesFromPayload(idTokenPayload);
  const backendRoles = tokenRoles.length ? tokenRoles : extractRolesFromPayload(accessTokenPayload);
  const nameFromToken = typeof idTokenPayload.name === "string" && idTokenPayload.name.trim() ? idTokenPayload.name.trim() : "";

  return {
    role: mapBackendRolesToAppRole(backendRoles.length ? backendRoles : previousSession?.backendRoles ?? []),
    name: nameFromToken || previousSession?.name || username,
    username,
    backendRoles: backendRoles.length ? backendRoles : previousSession?.backendRoles ?? [],
    token: auth.accessToken,
    idToken: auth.idToken,
    refreshToken: auth.refreshToken || previousSession?.refreshToken || "",
    tokenType: auth.tokenType || previousSession?.tokenType || "Bearer",
    expiresIn: auth.expiresIn,
    issuedAt: Date.now()
  };
}

function readStoredSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = normalizeStoredSession(JSON.parse(stored) as Partial<Session>);
    if (!parsed || parsed.token.startsWith("demo-")) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (isSessionExpired(parsed) && !parsed.refreshToken.trim()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistSession(session: Session) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  const currentConfig = readApiConfig();
  writeApiConfig({
    baseUrl: currentConfig.baseUrl,
    token: session.token
  });
}

function clearSessionStorage() {
  window.localStorage.removeItem(STORAGE_KEY);
  const currentConfig = readApiConfig();
  writeApiConfig({
    baseUrl: currentConfig.baseUrl,
    token: ""
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(session);
  const refreshPromiseRef = useRef<Promise<Session | null> | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  function clearActiveSession(nextError: string | null = null) {
    refreshPromiseRef.current = null;
    sessionRef.current = null;
    setSession(null);
    clearSessionStorage();
    setError(nextError);
  }

  async function refreshCurrentSession() {
    const currentSession = sessionRef.current;
    if (!currentSession?.refreshToken.trim()) {
      return null;
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const auth = await refreshCognitoSession(currentSession.refreshToken);
        const nextSession = buildSessionFromAuth(currentSession.username, auth, currentSession);
        sessionRef.current = nextSession;
        setSession(nextSession);
        persistSession(nextSession);
        setError(null);
        return nextSession;
      } catch {
        clearActiveSession("Tu sesion expiro. Vuelve a iniciar sesion.");
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }

  useEffect(() => {
    setApiAuthErrorListener((status) => {
      if (status === 401) {
        clearActiveSession("Tu sesion expiro o el token ya no es valido. Vuelve a iniciar sesion.");
        return;
      }

      if (status === 403) {
        setError((currentError) => currentError ?? "El backend rechazo la solicitud (403). Revisa permisos, rutas o configuracion del proxy.");
      }
    });

    setApiAuthRefreshHandler(async () => {
      const nextSession = await refreshCurrentSession();
      return nextSession?.token ?? null;
    });

    return () => {
      setApiAuthErrorListener(null);
      setApiAuthRefreshHandler(null);
    };
  }, []);

  useEffect(() => {
    if (!session || !isSessionExpired(session) || !session.refreshToken.trim()) {
      return;
    }

    let active = true;
    setLoading(true);

    void refreshCurrentSession().finally(() => {
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      error,
      async login(credentials) {
        setLoading(true);
        setError(null);

        try {
          const username = credentials.username.trim().toLowerCase();
          const auth = await loginWithCognitoOrDemo(username, credentials.password);
          const nextSession = buildSessionFromAuth(username, auth);

          sessionRef.current = nextSession;
          setSession(nextSession);
          persistSession(nextSession);
          return nextSession;
        } catch (loginError) {
          const message = loginError instanceof Error ? loginError.message : "No se pudo iniciar sesion.";
          setError(message);
          throw loginError;
        } finally {
          setLoading(false);
        }
      },
      async logout() {
        const currentSession = sessionRef.current;

        try {
          if (currentSession?.token) {
            await globalSignOut(currentSession.token);
          }
        } catch {
          // noop: cerramos la sesion local aunque Cognito no confirme el sign-out.
        } finally {
          clearActiveSession(null);
        }
      }
    }),
    [session, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

export function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isPathAllowedForRole(session.role, location.pathname)) {
    return <Navigate to={getDefaultPathForRole(session.role)} replace state={{ deniedFrom: location.pathname }} />;
  }

  return <Outlet />;
}