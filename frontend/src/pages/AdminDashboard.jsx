import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${minutes} ${ampm}`;
}

function convertTo24Hour(timeStr) {
  const [time, modifier] = timeStr.trim().split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") hours = "00";
  if (modifier && modifier.toUpperCase() === "PM") {
    hours = String(parseInt(hours, 10) + 12);
  }
  return `${hours.padStart(2, "0")}:${minutes || "00"}:00`;
}

export default function AdminDashboard() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState("schedules");
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line
  }, []);

  const fetchAll = async () => {
    try {
      const [b, r, s] = await Promise.all([
        api.get("/api/admin/buses"),
        api.get("/api/admin/routes"),
        api.get("/api/admin/schedules"),
      ]);
      setBuses(b.data);
      setRoutes(r.data);
      setSchedules(s.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin");
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h1>Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("schedules")}
          style={tabStyle(activeTab === "schedules")}
        >
          Schedules
        </button>
        <button
          onClick={() => setActiveTab("buses")}
          style={tabStyle(activeTab === "buses")}
        >
          Buses
        </button>
        <button
          onClick={() => setActiveTab("routes")}
          style={tabStyle(activeTab === "routes")}
        >
          Routes
        </button>
      </div>

      {activeTab === "schedules" && (
        <SchedulesTab
          schedules={schedules}
          buses={buses}
          routes={routes}
          refresh={fetchAll}
        />
      )}
      {activeTab === "buses" && <BusesTab buses={buses} refresh={fetchAll} />}
      {activeTab === "routes" && <RoutesTab routes={routes} refresh={fetchAll} />}
    </div>
  );
}

function SchedulesTab({ schedules, buses, routes, refresh }) {
  const [form, setForm] = useState({
    bus_id: "",
    route_id: "",
    departure_time: "",
    days_of_week: "Daily",
  });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      bus_id: parseInt(form.bus_id),
      route_id: parseInt(form.route_id),
      departure_time: convertTo24Hour(form.departure_time),
      days_of_week: form.days_of_week,
    };
    if (editingId) {
      await api.put(`/api/admin/schedules/${editingId}`, payload);
    } else {
      await api.post("/api/admin/schedules", payload);
    }
    setForm({ bus_id: "", route_id: "", departure_time: "", days_of_week: "Daily" });
    setEditingId(null);
    refresh();
  };

  const handleEdit = (s) => {
    setEditingId(s.id);
    setForm({
      bus_id: s.bus_id,
      route_id: s.route_id,
      departure_time: formatTime(s.departure_time),
      days_of_week: s.days_of_week,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this schedule?")) return;
    await api.delete(`/api/admin/schedules/${id}`);
    refresh();
  };

  return (
    <div>
      <h3>{editingId ? "Edit Schedule" : "Add Schedule"}</h3>
      <form
        onSubmit={handleSubmit}
        style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <select
          value={form.bus_id}
          onChange={(e) => setForm({ ...form, bus_id: e.target.value })}
          required
          style={inputStyle}
        >
          <option value="">Select Bus</option>
          {buses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.plate_number}
            </option>
          ))}
        </select>
        <select
          value={form.route_id}
          onChange={(e) => setForm({ ...form, route_id: e.target.value })}
          required
          style={inputStyle}
        >
          <option value="">Select Route</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.origin} → {r.destination}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="e.g. 04:00 AM"
          value={form.departure_time}
          onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
          required
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>
          {editingId ? "Update" : "Add"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({
                bus_id: "",
                route_id: "",
                departure_time: "",
                days_of_week: "Daily",
              });
            }}
            style={buttonStyle}
          >
            Cancel
          </button>
        )}
      </form>

      <table
        style={{ width: "100%", borderCollapse: "collapse", background: "white" }}
      >
        <thead>
          <tr style={{ background: "#333", color: "white" }}>
            <th style={thStyle}>Plate</th>
            <th style={thStyle}>Route</th>
            <th style={thStyle}>Departure</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={tdStyle}>{s.plate_number}</td>
              <td style={tdStyle}>
                {s.origin} → {s.destination}
              </td>
              <td style={tdStyle}>{formatTime(s.departure_time)}</td>
              <td style={tdStyle}>
                <button onClick={() => handleEdit(s)} style={smallBtn}>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  style={{ ...smallBtn, background: "#d33", color: "white" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BusesTab({ buses, refresh }) {
  const [form, setForm] = useState({ plate_number: "", capacity: 50 });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/api/admin/buses/${editingId}`, form);
    } else {
      await api.post("/api/admin/buses", form);
    }
    setForm({ plate_number: "", capacity: 50 });
    setEditingId(null);
    refresh();
  };

  const handleEdit = (b) => {
    setEditingId(b.id);
    setForm({ plate_number: b.plate_number, capacity: b.capacity });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this bus?")) return;
    await api.delete(`/api/admin/buses/${id}`);
    refresh();
  };

  return (
    <div>
      <h3>{editingId ? "Edit Bus" : "Add Bus"}</h3>
      <form
        onSubmit={handleSubmit}
        style={{ marginBottom: 20, display: "flex", gap: 10 }}
      >
        <input
          placeholder="Plate Number"
          value={form.plate_number}
          onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
          required
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Capacity"
          value={form.capacity}
          onChange={(e) =>
            setForm({ ...form, capacity: parseInt(e.target.value) })
          }
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>
          {editingId ? "Update" : "Add"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ plate_number: "", capacity: 50 });
            }}
            style={buttonStyle}
          >
            Cancel
          </button>
        )}
      </form>

      <table
        style={{ width: "100%", borderCollapse: "collapse", background: "white" }}
      >
        <thead>
          <tr style={{ background: "#333", color: "white" }}>
            <th style={thStyle}>Plate</th>
            <th style={thStyle}>Capacity</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {buses.map((b) => (
            <tr key={b.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={tdStyle}>{b.plate_number}</td>
              <td style={tdStyle}>{b.capacity}</td>
              <td style={tdStyle}>
                <button onClick={() => handleEdit(b)} style={smallBtn}>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  style={{ ...smallBtn, background: "#d33", color: "white" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoutesTab({ routes, refresh }) {
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    base_travel_mins: 0,
  });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/api/admin/routes/${editingId}`, form);
    } else {
      await api.post("/api/admin/routes", form);
    }
    setForm({ origin: "", destination: "", base_travel_mins: 0 });
    setEditingId(null);
    refresh();
  };

  const handleEdit = (r) => {
    setEditingId(r.id);
    setForm({
      origin: r.origin,
      destination: r.destination,
      base_travel_mins: r.base_travel_mins,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this route?")) return;
    await api.delete(`/api/admin/routes/${id}`);
    refresh();
  };

  return (
    <div>
      <h3>{editingId ? "Edit Route" : "Add Route"}</h3>
      <form
        onSubmit={handleSubmit}
        style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <input
          placeholder="Origin"
          value={form.origin}
          onChange={(e) => setForm({ ...form, origin: e.target.value })}
          required
          style={inputStyle}
        />
        <input
          placeholder="Destination"
          value={form.destination}
          onChange={(e) => setForm({ ...form, destination: e.target.value })}
          required
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Travel Mins"
          value={form.base_travel_mins}
          onChange={(e) =>
            setForm({ ...form, base_travel_mins: parseInt(e.target.value) })
          }
          required
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>
          {editingId ? "Update" : "Add"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ origin: "", destination: "", base_travel_mins: 0 });
            }}
            style={buttonStyle}
          >
            Cancel
          </button>
        )}
      </form>

      <table
        style={{ width: "100%", borderCollapse: "collapse", background: "white" }}
      >
        <thead>
          <tr style={{ background: "#333", color: "white" }}>
            <th style={thStyle}>Origin</th>
            <th style={thStyle}>Destination</th>
            <th style={thStyle}>Travel Mins</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={tdStyle}>{r.origin}</td>
              <td style={tdStyle}>{r.destination}</td>
              <td style={tdStyle}>{r.base_travel_mins}</td>
              <td style={tdStyle}>
                <button onClick={() => handleEdit(r)} style={smallBtn}>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  style={{ ...smallBtn, background: "#d33", color: "white" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = { padding: 12, textAlign: "left" };
const tdStyle = { padding: 12 };
const inputStyle = { padding: 8, border: "1px solid #ccc", borderRadius: 4 };
const buttonStyle = {
  padding: "8px 16px",
  background: "#333",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};
const smallBtn = {
  padding: "4px 10px",
  marginRight: 5,
  background: "#555",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};
const tabStyle = (active) => ({
  padding: "8px 16px",
  marginRight: 10,
  background: active ? "#333" : "#ddd",
  color: active ? "white" : "#333",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
});
