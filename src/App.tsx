import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./app/AppShell";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import EventDetail from "./pages/EventDetail";
import MyTickets from "./pages/MyTickets";
import Staff from "./pages/Staff";
import StaffEvents from "./pages/StaffEvents";
import CreateEvent from "./pages/CreateEvent";
import DebugConsole from "./pages/DebugConsole";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/event/:eventId" element={<EventDetail />} />
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/staff/events" element={<StaffEvents />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/debug" element={<DebugConsole />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
