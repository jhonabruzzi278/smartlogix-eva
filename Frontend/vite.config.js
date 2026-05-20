var _a, _b;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
var edgeTarget = (_a = process.env.SMARTLOGIX_EDGE_TARGET) !== null && _a !== void 0 ? _a : "http://localhost:8080";
var localstackTarget = (_b = process.env.LOCALSTACK_TARGET) !== null && _b !== void 0 ? _b : "http://localhost:4567";
function stripBrowserOrigin(proxy) {
    proxy.on("proxyReq", function (proxyReq) {
        proxyReq.removeHeader("origin");
        proxyReq.removeHeader("referer");
    });
}
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.svg", "icon-app.svg", "mask-icon.svg"],
            manifest: {
                name: "SmartLogix",
                short_name: "SmartLogix",
                description: "Dashboard logistico mobile-first para inventario, pedidos, envios y alertas.",
                theme_color: "#0f172a",
                background_color: "#f6f7f3",
                display: "standalone",
                orientation: "portrait",
                start_url: "/",
                scope: "/",
                icons: [
                    {
                        src: "/icon-app.svg",
                        sizes: "192x192",
                        type: "image/svg+xml",
                        purpose: "any"
                    },
                    {
                        src: "/mask-icon.svg",
                        sizes: "512x512",
                        type: "image/svg+xml",
                        purpose: "maskable"
                    }
                ]
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
                cleanupOutdatedCaches: true,
                navigateFallback: "index.html"
            },
            devOptions: {
                enabled: true
            }
        })
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    },
    server: {
        host: true,
        port: 3000,
        headers: {
            "ngrok-skip-browser-warning": "true"
        },
        proxy: {
            "/aws/cognito": {
                target: localstackTarget,
                changeOrigin: true,
                rewrite: function () { return "/"; },
                configure: stripBrowserOrigin
            },
            "/_aws/cognito-idp": {
                target: localstackTarget,
                changeOrigin: true,
                configure: stripBrowserOrigin
            },
            "/api": {
                target: edgeTarget,
                changeOrigin: true
            },
            "/actuator": {
                target: edgeTarget,
                changeOrigin: true
            }
        }
    }
});
