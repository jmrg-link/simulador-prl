/**
 * Punto de entrada del frontal.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
import { silenceKnownThreeWarnings } from "./shared/three-console.ts";

silenceKnownThreeWarnings();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
