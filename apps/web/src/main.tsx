import "@annecto-grid/ui/tokens.css";
import "@annecto-grid/ui/base.css";
import "./app.css";

import { applyTheme, systemTheme } from "@annecto-grid/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";

// The theme follows the operating system until users can choose it (M3).
const media = window.matchMedia("(prefers-color-scheme: dark)");
applyTheme(document.documentElement, systemTheme(media.matches));
media.addEventListener("change", (e) => applyTheme(document.documentElement, systemTheme(e.matches)));

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing in index.html");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
