import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./fin";

import "./style.css";

window.storage = {
    async get(key: string) {
        const value = localStorage.getItem(key);
        return value == null ? null : { value };
    },
    async set(key: string, value: string) {
        localStorage.setItem(key, value);
    },
    async remove(key: string) {
        localStorage.removeItem(key);
    },
};

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
        <Analytics />
        <SpeedInsights />
    </React.StrictMode>,
);