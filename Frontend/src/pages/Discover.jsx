import { useEffect, useState } from "react";
import apiClient from "../api/client";
import MatchCard from "../components/MatchCard";

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
};

const Discover = () => {
  const [activityOptions, setActivityOptions] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  // The filters an in-flight/last search actually ran with — MatchCard needs
  // this (not the live `filters` state) to know which breakdown categories
  // the backend scored vs. left out.
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

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

      {loading && <p style={{ color: "#64748b" }}>Loading matches...</p>}
      {errorMsg && <p style={{ color: "#dc2626" }}>{errorMsg}</p>}
      {!loading && matches && matches.length === 0 && (
        <p style={{ color: "#64748b" }}>No partners found.</p>
      )}

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
            appliedFilters={appliedFilters}
            requestState={requestStatus[match.profile.user._id]}
            onSendRequest={() => sendRequest(match.profile.user._id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Discover;
