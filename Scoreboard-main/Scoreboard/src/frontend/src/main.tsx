import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { RealtimeSync } from "./components/RealtimeSync";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    storageKey="DSSL-theme"
    enableSystem
  >
    <QueryClientProvider client={queryClient}>
      <RealtimeSync />
      <App />
    </QueryClientProvider>
  </ThemeProvider>,
);
