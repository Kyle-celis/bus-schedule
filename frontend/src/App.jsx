import { Routes, Route, Navigate } from "react-router-dom";
import PublicSchedule from "./pages/PublicSchedule";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicSchedule />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
