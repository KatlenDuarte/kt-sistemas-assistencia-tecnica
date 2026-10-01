import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SessionProvider } from "./contexts/SessionContext";
import { ToastProvider } from "./contexts/ToastContext";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <SessionProvider>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </SessionProvider>
        </ThemeProvider>
    </StrictMode>,
);
