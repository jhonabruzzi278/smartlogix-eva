import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { router } from "@/app/router";
import { AuthProvider } from "@/app/auth";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { ToastProvider } from "@/components/common/toast-provider";
import "@/styles/index.css";

const isLocalEnvironment = ["localhost", "127.0.0.1"].includes(window.location.hostname);

if (isLocalEnvironment) {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });
    });
  }

  if ("caches" in window) {
    window.addEventListener("load", () => {
      void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    });
  }
} else {
  registerSW({ immediate: true });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
