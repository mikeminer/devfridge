import "./polyfill";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CountdownOverlay from "./components/CountdownOverlay";
import ErrorBoundary from "./components/ErrorBoundary";
import { AppStateProvider } from "./state";
import "./index.css";

const root = document.getElementById("root");
try {
  ReactDOM.createRoot(root!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AppStateProvider>
          <CountdownOverlay>
            <App />
          </CountdownOverlay>
        </AppStateProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (err) {
  if (root) {
    root.innerHTML =
      '<div style="padding:24px;color:#ff8ea0;font-family:sans-serif">' +
      String(err) +
      "</div>";
  }
}
