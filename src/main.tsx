import React from "react";
import ReactDOM from "react-dom/client";

import "@mysten/dapp-kit/dist/index.css";
import "@radix-ui/themes/styles.css";
import "./styles.css";

import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";

import App from "./App";
import RegisterEnokiWallets from "./app/RegisterEnokiWallets";
import { networkConfig, DEFAULT_NETWORK } from "./config/network";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme
      appearance="dark"
      accentColor="indigo"
      grayColor="slate"
      radius="large"
    >
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider
          networks={networkConfig}
          defaultNetwork={DEFAULT_NETWORK}
        >
          <WalletProvider>
            <RegisterEnokiWallets />
            <App />
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>,
);
