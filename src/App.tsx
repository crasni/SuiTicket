import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import TestConsole from "./components/TestConsole";

export default function App() {
  const account = useCurrentAccount();

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Suistage Event Creation and Ticket Redeem</h2>
        <ConnectButton />
      </header>

      <div style={{ marginTop: 12, opacity: 0.8 }}>
        {account ? (
          <>
            Connected: <code>{account.address}</code>
          </>
        ) : (
          <>請先連錢包</>
        )}
      </div>

      <hr style={{ margin: "20px 0" }} />

      <TestConsole />
    </div>
  );
}
