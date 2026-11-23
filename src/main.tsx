import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./styles.css";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

const root = createRoot(document.getElementById("root")!);

if (!url) {
  root.render(
    <div className="center-screen">
      <div className="login-card">
        <h1 className="brand-big">Dial Room</h1>
        <p>
          VITE_CONVEX_URL isn't set. Run <code>npx convex dev</code> in the project folder once, then
          restart <code>npm run dev</code>.
        </p>
      </div>
    </div>,
  );
} else {
  const convex = new ConvexReactClient(url);
  root.render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </StrictMode>,
  );
}
