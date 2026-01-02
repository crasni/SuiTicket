import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./app/AppShell";
import Explore from "./pages/Explore";
import EventDetail from "./pages/EventDetail";
import MyTickets from "./pages/MyTickets";
import Staff from "./pages/Staff";
import CreateEvent from "./pages/CreateEvent";
import DebugConsole from "./pages/DebugConsole";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Explore />} />
          <Route path="/event/:eventId" element={<EventDetail />} />
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/debug" element={<DebugConsole />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
