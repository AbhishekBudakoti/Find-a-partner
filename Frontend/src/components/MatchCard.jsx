import { Link } from "react-router-dom";
import OnlineStatus from "./OnlineStatus";

// Fixed palette roles reused verbatim from the design system's validated
// defaults — status colors are never re-themed, sequential blue is the
// single magnitude hue. See dataviz skill / references/palette.md.
const COLORS = {
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  textMuted: "#898781",
  track: "#e1e0d9",
  border: "rgba(11,11,11,0.10)",
  seqBlue: "#2a78d6",
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

// matchQuality -> chip fill + the text color that clears contrast on it.
const QUALITY_STYLE = {
  "Excellent match": { fill: COLORS.good, text: "#ffffff" },
  "Good match": { fill: COLORS.seqBlue, text: "#ffffff" },
  "Fair match": { fill: COLORS.warning, text: COLORS.textPrimary },
  "Low match": { fill: COLORS.critical, text: "#ffffff" },
};

// Mirrors MATCH_WEIGHT in Backend/services/matching.service.js. `appliesWhen`
// mirrors that same file's `availableWeight` gating: a category only entered
// the score if its criterion was actually part of the search.
const BREAKDOWN_CATEGORIES = [
  { key: "activity", label: "Activity", max: 30, appliesWhen: (f) => !!f.activity },
  { key: "location", label: "Location", max: 20, appliesWhen: (f) => !!f.city },
  { key: "availability", label: "Availability", max: 25, appliesWhen: (f) => !!f.day },
  { key: "skill", label: "Skill level", max: 15, appliesWhen: (f) => !!f.skillLevel },
  { key: "rating", label: "Rating", max: 10, appliesWhen: () => true },
];

// Per-category severity, independent of the overall matchQuality thresholds —
// this answers "how strong is this one dimension", not "how strong overall".
const severityColor = (ratio) => {
  if (ratio >= 0.75) return COLORS.good;
  if (ratio >= 0.5) return COLORS.warning;
  if (ratio >= 0.25) return COLORS.serious;
  return COLORS.critical;
};

const Meter = ({ label, value, max, applicable, hint }) => {
  const ratio = applicable ? Math.min(value / max, 1) : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "3px 0" }} title={applicable ? undefined : hint}>
      <span style={{ width: "92px", fontSize: "12px", color: COLORS.textSecondary, flexShrink: 0 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: "8px",
          borderRadius: "4px",
          backgroundColor: COLORS.track,
          overflow: "hidden",
        }}
      >
        {applicable && (
          <div
            style={{
              width: `${ratio * 100}%`,
              height: "100%",
              borderRadius: "4px",
              backgroundColor: severityColor(ratio),
            }}
          />
        )}
      </div>
      <span
        style={{
          width: "50px",
          textAlign: "right",
          fontSize: "12px",
          color: applicable ? COLORS.textSecondary : COLORS.textMuted,
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {applicable ? `${value}/${max}` : "n/a"}
      </span>
    </div>
  );
};

/**
 * A single ranked-match result: identity, the overall score as a hero figure
 * + status-colored quality chip, and a per-category breakdown of how that
 * score was earned (mirrors the backend's weighted match algorithm 1:1).
 */
const MatchCard = ({ rank, profile, matchScore, matchQuality, matchBreakdown, appliedFilters, requestState, onSendRequest }) => {
  const quality = QUALITY_STYLE[matchQuality] || { fill: COLORS.track, text: COLORS.textPrimary };
  const name = profile.user?.name || profile.user?.email || "Unknown";
  const initial = name.charAt(0).toUpperCase();
  const userId = profile.user?._id;

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "#fff",
        border: `1px solid ${COLORS.border}`,
        borderRadius: "14px",
        padding: "20px",
        boxShadow: "0 1px 2px rgba(11,11,11,0.04)",
      }}
    >
      {rank <= 3 && (
        <span style={{ position: "absolute", top: "16px", right: "20px", fontSize: "11px", fontWeight: 700, color: COLORS.textMuted }}>
          #{rank}
        </span>
      )}

      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "#eef2ff",
            color: "#3730a3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "16px",
            flexShrink: 0,
          }}
        >
          {initial}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "15px", color: COLORS.textPrimary }}>{name}</div>
          <div style={{ fontSize: "12.5px", color: COLORS.textSecondary, marginTop: "2px" }}>
            {profile.skillLevel} · {profile.location?.city || "city not set"} ·{" "}
            {(profile.activities || []).map((a) => a.name).join(", ") || "no activities listed"}
          </div>
          <div style={{ marginTop: "4px" }}>
            <OnlineStatus userId={userId} />
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "30px", fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1 }}>
            {matchScore}
            <span style={{ fontSize: "16px", fontWeight: 600, color: COLORS.textMuted }}>%</span>
          </div>
          <span
            style={{
              display: "inline-block",
              marginTop: "6px",
              padding: "2px 10px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 600,
              backgroundColor: quality.fill,
              color: quality.text,
            }}
          >
            {matchQuality}
          </span>
        </div>
      </div>

      <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: `1px solid ${COLORS.track}` }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: "8px",
          }}
        >
          Match breakdown
        </div>
        {BREAKDOWN_CATEGORIES.map((cat) => (
          <Meter
            key={cat.key}
            label={cat.label}
            value={matchBreakdown?.[cat.key] || 0}
            max={cat.max}
            applicable={cat.appliesWhen(appliedFilters)}
            hint={`Add a ${cat.label.toLowerCase()} filter to compare on this`}
          />
        ))}
      </div>

      <div style={{ marginTop: "16px", display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
        <Link
          to={`/chat/${userId}?name=${encodeURIComponent(name)}`}
          style={{
            padding: "7px 14px",
            fontSize: "13px",
            fontWeight: 600,
            color: COLORS.textSecondary,
            border: `1px solid ${COLORS.track}`,
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          Message
        </Link>
        <button
          type="button"
          onClick={onSendRequest}
          disabled={requestState === "sending" || requestState === "sent"}
          style={{
            padding: "7px 14px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: requestState === "sent" ? COLORS.good : COLORS.seqBlue,
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {requestState === "sent" ? "Request sent" : requestState === "sending" ? "Sending..." : "Send request"}
        </button>
      </div>

      {requestState && !["sending", "sent"].includes(requestState) && (
        <div style={{ marginTop: "6px", textAlign: "right", fontSize: "12px", color: COLORS.critical }}>{requestState}</div>
      )}
    </div>
  );
};

export default MatchCard;
