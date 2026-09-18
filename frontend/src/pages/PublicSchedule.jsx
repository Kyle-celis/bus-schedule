import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { publicApi } from "../api";

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${minutes} ${ampm}`;
}

function getAmPm(timeStr) {
  if (!timeStr) return "";
  const [hours] = timeStr.split(":");
  return parseInt(hours, 10) >= 12 ? "PM" : "AM";
}

function getMinutesLeft(departureTime) {
  if (!departureTime) return null;
  const [h, m, s] = departureTime.split(":").map(Number);
  const now = new Date();
  const dep = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s || 0);
  return Math.round((dep - now) / 60000);
}

export default function PublicSchedule() {
  const isMobile = useMediaQuery({ maxWidth: 600 });

  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [busFilter, setBusFilter] = useState("All");
  const [ampmFilter, setAmpmFilter] = useState("All");
  const [departureFilter, setDepartureFilter] = useState("All");
  const [sortAsc, setSortAsc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

useEffect(() => {
  const fetchSchedule = () => {
    publicApi
      .get("/api/schedule")
      .then((res) => setSchedule(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  fetchSchedule();
  const interval = setInterval(fetchSchedule, 10000);

  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const phTime = currentTime.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const busList = ["All", ...new Set(schedule.map((s) => s.plate_number))];
  const departureList = ["All", ...new Set(schedule.map((s) => s.origin))];

  let filtered = schedule.filter((row) => {
    if (busFilter !== "All" && row.plate_number !== busFilter) return false;
    if (ampmFilter !== "All" && getAmPm(row.departure_time) !== ampmFilter)
      return false;
    if (departureFilter !== "All" && row.origin !== departureFilter)
      return false;
    return true;
  });

  filtered = filtered.sort((a, b) => {
    const ta = a.departure_time;
    const tb = b.departure_time;
    return sortAsc ? ta.localeCompare(tb) : tb.localeCompare(ta);
  });

  if (loading) return <p style={{ padding: 20 }}>Loading schedule...</p>;

  return (
    <div style={container}>
      <div style={headerRow}>
        <h1 style={title}>Bacolod Bus Schedule</h1>
        <div style={clockBox}>{phTime}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={toggleButton}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {showFilters && (
        <div style={filterPanel}>
          <div style={filterGroup}>
            <label style={labelStyle}>Bus:</label>
            <select
              value={busFilter}
              onChange={(e) => setBusFilter(e.target.value)}
              style={filterSelect}
            >
              {busList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div style={filterGroup}>
            <label style={labelStyle}>Departure:</label>
            <select
              value={departureFilter}
              onChange={(e) => setDepartureFilter(e.target.value)}
              style={filterSelect}
            >
              {departureList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div style={filterGroup}>
            <label style={labelStyle}>Time:</label>
            <select
              value={ampmFilter}
              onChange={(e) => setAmpmFilter(e.target.value)}
              style={filterSelect}
            >
              <option value="All">All</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          <div style={filterGroup}>
            <button onClick={() => setSortAsc(!sortAsc)} style={sortButton}>
              Sort: {sortAsc ? "Earliest First" : "Latest First"}
            </button>
          </div>

          <div style={filterGroup}>
            <button
              onClick={() => {
                setBusFilter("All");
                setAmpmFilter("All");
                setDepartureFilter("All");
                setSortAsc(true);
              }}
              style={resetButton}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p style={{ textAlign: "center", padding: 20 }}>
          No schedules match your filter.
        </p>
      ) : isMobile ? (
        <div>
          {filtered.map((row, i) => {
            const minsLeft = getMinutesLeft(row.departure_time);
            const isSoon = minsLeft !== null && minsLeft >= 0 && minsLeft <= 5;
            const isDeparted = minsLeft !== null && minsLeft < 0;

            return (
              <div
                key={i}
                style={{
                  ...cardStyle,
                  background: isSoon ? "#fff3cd" : isDeparted ? "#f0f0f0" : "white",
                  borderLeft: isSoon ? "5px solid #ffc107" : "5px solid transparent",
                  opacity: isDeparted ? 0.6 : 1,
                }}
              >
                {isSoon && (
                  <div style={{ color: "#856404", fontWeight: "bold", marginBottom: 8 }}>
                    Departing in {minsLeft} min
                  </div>
                )}
                {isDeparted && (
                  <div style={{ color: "#888", fontWeight: "bold", marginBottom: 8 }}>
                    Departed
                  </div>
                )}
                <div style={cardRow}>
                  <span style={cardLabel}>Bus:</span>
                  <span style={cardValue}>{row.plate_number}</span>
                </div>
                <div style={cardRow}>
                  <span style={cardLabel}>From:</span>
                  <span style={cardValue}>{row.origin}</span>
                </div>
                <div style={cardRow}>
                  <span style={cardLabel}>Departure:</span>
                  <span style={cardValue}>{formatTime(row.departure_time)}</span>
                </div>
                <div style={cardRow}>
                  <span style={cardLabel}>To:</span>
                  <span style={cardValue}>{row.destination}</span>
                </div>
                <div style={cardRow}>
                  <span style={cardLabel}>Arrival:</span>
                  <span style={cardValue}>{formatTime(row.arrival_time)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr style={{ background: "#333", color: "white" }}>
                <th style={thStyle}>Bus</th>
                <th style={thStyle}>From</th>
                <th style={thStyle}>Departure</th>
                <th style={thStyle}>To</th>
                <th style={thStyle}>Arrival</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const minsLeft = getMinutesLeft(row.departure_time);
                const isSoon = minsLeft !== null && minsLeft >= 0 && minsLeft <= 5;
                const isDeparted = minsLeft !== null && minsLeft < 0;

                return (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid #ddd",
                      background: isSoon ? "#fff3cd" : isDeparted ? "#f0f0f0" : "white",
                      borderLeft: isSoon ? "5px solid #ffc107" : "5px solid transparent",
                      opacity: isDeparted ? 0.6 : 1,
                    }}
                  >
                    <td style={tdStyle}>
                      {isSoon && <span style={{ color: "#856404", fontWeight: "bold" }}>Soon </span>}
                      {row.plate_number}
                    </td>
                    <td style={tdStyle}>{row.origin}</td>
                    <td style={tdStyle}>{formatTime(row.departure_time)}</td>
                    <td style={tdStyle}>{row.destination}</td>
                    <td style={tdStyle}>{formatTime(row.arrival_time)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const container = { padding: 12, maxWidth: 1000, margin: "0 auto", fontSize: 14 };
const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
  flexWrap: "wrap",
  gap: 8,
};
const title = { fontSize: 20, margin: 0 };
const clockBox = {
  padding: "6px 12px",
  background: "#333",
  color: "white",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: "bold",
  whiteSpace: "nowrap",
};
const table = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
  fontSize: 13,
  minWidth: 500,
};
const thStyle = { padding: "8px 6px", textAlign: "left", fontSize: 12, whiteSpace: "nowrap" };
const tdStyle = { padding: "8px 6px", whiteSpace: "nowrap" };
const cardStyle = {
  background: "white",
  padding: 14,
  borderRadius: 8,
  marginBottom: 10,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  transition: "all 0.3s",
};
const cardRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "4px 0",
  borderBottom: "1px solid #f0f0f0",
};
const cardLabel = { fontWeight: "bold", color: "#666" };
const cardValue = { textAlign: "right" };
const labelStyle = { display: "block", marginBottom: 4, fontWeight: "bold", fontSize: 12 };
const filterSelect = {
  padding: 8,
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "white",
  width: "100%",
  fontSize: 14,
};
const toggleButton = {
  padding: "8px 16px",
  background: "#333",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: "bold",
};
const filterPanel = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
  padding: 12,
  background: "white",
  borderRadius: 8,
  marginBottom: 15,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};
const filterGroup = { display: "flex", flexDirection: "column" };
const sortButton = {
  padding: "8px 12px",
  background: "#333",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  marginTop: "auto",
  fontSize: 13,
};
const resetButton = {
  padding: "8px 12px",
  background: "#d33",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  marginTop: "auto",
  fontSize: 13,
};