import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import App from "./App";
import { css } from "./lib/utils";

// Inject global styles
const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a2235",
              border: "1px solid #1e2a3f",
              color: "#e2e8f0",
              fontSize: 13,
            },
          }}
        />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>
);
