import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/client";
import OnlineStatus from "../components/OnlineStatus";

const DAYS = ["", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const SKILL_LEVELS = ["", "beginner", "intermediate", "advanced"];

const inputStyle = {
  padding: "8px 10px",
  fontSize: "13px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
};

const qualityColor = {
  "Excellent match": "#16a34a",
  "Good match": "#2563eb",
  "Fair match": "#d97706",
  "Low match": "#94a3b8",
};

const Discover = () => {
  const [activityOptions, setActivityOptions] = useState([]);
  const [filters, setFilters] = useState({
    activity: "",
    city: "",
    day: "",
    startTime: "",
    endTime: "",
    skillLevel: "",
  });

  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [requestStatus, setRequestStatus] = useState({});

  useEffect(() => {
    apiClient
      .get("/activities")
      .then(({ data }) => setActivityOptions(data.data?.activities || []))
      .catch(() => {});
  }, []);

  const setFilter = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));

  const runSearch = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await apiClient.get("/matches", { params });
      setMatches(data.data?.matches || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load matches");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  // Run an unfiltered search on first load so the page isn't empty.
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendRequest = async (recipientId) => {
    setRequestStatus((prev) => ({ ...prev, [recipientId]: "sending" }));
    try {
      await apiClient.post("/requests", { recipient: recipientId, message: "Let's team up!" });
      setRequestStatus((prev) => ({ ...prev, [recipientId]: "sent" }));
    } catch (err) {
      setRequestStatus((prev) => ({
        ...prev,
        [recipientId]: err.response?.data?.message || "failed",
      }));
    }
  };

  return (
    <div style={{ maxWidth: "760px", margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "20px", color: "#0f172a" }}>Discover partners</h1>

      <form
        onSubmit={runSearch}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          padding: "16px",
          backgroundColor: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <select value={filters.activity} onChange={(e) => setFilter("activity", e.target.value)} style={inputStyle}>
          <option value="">Any activity</option>
          {activityOptions.map((a) => (
            <option key={a._id} value={a._id}>
              {a.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="City"
          value={filters.city}
          onChange={(e) => setFilter("city", e.target.value)}
          style={inputStyle}
        />

        <select value={filters.day} onChange={(e) => setFilter("day", e.target.value)} style={inputStyle}>
          {DAYS.map((day) => (
            <option key={day} value={day}>
              {day || "Any day"}
            </option>
          ))}
        </select>

        <input
          type="time"
          value={filters.startTime}
          onChange={(e) => setFilter("startTime", e.target.value)}
          style={inputStyle}
        />
        <input
          type="time"
          value={filters.endTime}
          onChange={(e) => setFilter("endTime", e.target.value)}
          style={inputStyle}
        />

        <select value={filters.skillLevel} onChange={(e) => setFilter("skillLevel", e.target.value)} style={inputStyle}>
          {SKILL_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level || "Any skill level"}
            </option>
          ))}
        </select>

        <button
          type="submit"
          style={{
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "#2563eb",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>

      {loading && <p style={{ color: "#64748b" }}>Loading matches...</p>}
      {errorMsg && <p style={{ color: "#dc2626" }}>{errorMsg}</p>}
      {!loading && matches && matches.length === 0 && <p style={{ color: "#64748b" }}>No partners found.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {matches?.map(({ profile, matchScore, matchQuality }) => (
          <div
            key={profile._id}
            style={{
              padding: "16px",
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>
                {profile.user?.name || profile.user?.email}{" "}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: qualityColor[matchQuality] || "#64748b",
                  }}
                >
                  {matchQuality} ({matchScore}%)
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                {profile.skillLevel} · {profile.location?.city || "no city set"} ·{" "}
                {(profile.activities || []).map((a) => a.name).join(", ") || "no activities"}
              </div>
              <div style={{ marginTop: "4px" }}>
                <OnlineStatus userId={profile.user?._id} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Link
                to={`/chat/${profile.user._id}?name=${encodeURIComponent(profile.user.name || "")}`}
                style={{ fontSize: "13px", color: "#2563eb" }}
              >
                Message
              </Link>
              <button
                type="button"
                onClick={() => sendRequest(profile.user._id)}
                disabled={requestStatus[profile.user._id] === "sending" || requestStatus[profile.user._id] === "sent"}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  color: "#fff",
                  backgroundColor: requestStatus[profile.user._id] === "sent" ? "#16a34a" : "#2563eb",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {requestStatus[profile.user._id] === "sent"
                  ? "Request sent"
                  : requestStatus[profile.user._id] === "sending"
                    ? "Sending..."
                    : "Send request"}
              </button>
              {requestStatus[profile.user._id] &&
                !["sending", "sent"].includes(requestStatus[profile.user._id]) && (
                  <span style={{ fontSize: "12px", color: "#dc2626" }}>{requestStatus[profile.user._id]}</span>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Discover;
