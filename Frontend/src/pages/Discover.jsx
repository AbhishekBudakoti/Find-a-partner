import { useEffect, useState } from "react";
import apiClient from "../api/client";
import MatchCard from "../components/MatchCard";
import PartnersMap from "../components/PartnersMap";

const DAYS = [
  "",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const SKILL_LEVELS = ["", "beginner", "intermediate", "advanced"];

const inputStyle = {
  padding: "8px 10px",
  fontSize: "13px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
};

const emptyFilters = {
  activity: "",
  city: "",
  day: "",
  startTime: "",
  endTime: "",
  skillLevel: "",
  radiusKm: "",
};

const Discover = () => {
  const [activityOptions, setActivityOptions] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  // The filters an in-flight/last search actually ran with — MatchCard needs
  // this (not the live `filters` state) to know which breakdown categories
  // the backend scored vs. left out.
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [viewMode, setViewMode] = useState("list");

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

  const setFilter = (field, value) =>
    setFilters((prev) => ({ ...prev, [field]: value }));

  const runSearch = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v),
      );
      const { data } = await apiClient.get("/matches", { params });
      setMatches(data.data?.matches || []);
      setAppliedFilters(filters);
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
      await apiClient.post("/requests", {
        recipient: recipientId,
        message: "Let's team up!",
      });
      setRequestStatus((prev) => ({ ...prev, [recipientId]: "sent" }));
    } catch (err) {
      setRequestStatus((prev) => ({
        ...prev,
        [recipientId]: err.response?.data?.message || "failed",
      }));
    }
  };

  return (
    <div style={{ maxWidth: "1040px", margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "26px", color: "#0f172a", margin: "0 0 4px" }}>
        Discover partners
      </h1>
      <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px" }}>
        Ranked by a weighted match score across activity, location,
        availability, skill level, and rating.
      </p>

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
          marginBottom: "24px",
        }}
      >
        <select
          value={filters.activity}
          onChange={(e) => setFilter("activity", e.target.value)}
          style={inputStyle}
        >
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

        <select
          value={filters.radiusKm}
          onChange={(e) => setFilter("radiusKm", e.target.value)}
          style={inputStyle}
        >
          <option value="">Any distance</option>
          <option value="5">5 km</option>
          <option value="10">10 km</option>
          <option value="25">25 km</option>
          <option value="50">50 km</option>
        </select>

        <select
          value={filters.day}
          onChange={(e) => setFilter("day", e.target.value)}
          style={inputStyle}
        >
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

        <select
          value={filters.skillLevel}
          onChange={(e) => setFilter("skillLevel", e.target.value)}
          style={inputStyle}
        >
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
          {matches ? `${matches.length} ${matches.length === 1 ? "partner" : "partners"} found` : ""}
        </span>
        <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              backgroundColor: viewMode === "list" ? "#ffffff" : "transparent",
              color: viewMode === "list" ? "#0f172a" : "#64748b",
              boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            📋 List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              backgroundColor: viewMode === "map" ? "#ffffff" : "transparent",
              color: viewMode === "map" ? "#0f172a" : "#64748b",
              boxShadow: viewMode === "map" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            🗺️ Map
          </button>
        </div>
      </div>

      {loading && <p style={{ color: "#64748b" }}>Loading matches...</p>}
      {errorMsg && <p style={{ color: "#dc2626" }}>{errorMsg}</p>}
      {!loading && matches && matches.length === 0 && (
        <p style={{ color: "#64748b" }}>No partners found.</p>
      )}

      {viewMode === "map" ? (
        <PartnersMap matches={matches || []} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "16px",
          }}
        >
          {matches?.map((match, index) => (
            <MatchCard
              key={match.profile._id}
              rank={index + 1}
              profile={match.profile}
              matchScore={match.matchScore}
              matchQuality={match.matchQuality}
              matchBreakdown={match.matchBreakdown}
              distanceKm={match.distanceKm}
              appliedFilters={appliedFilters}
              requestState={requestStatus[match.profile.user._id]}
              onSendRequest={() => sendRequest(match.profile.user._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Discover;
