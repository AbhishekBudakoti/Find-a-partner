import { Link } from "react-router-dom";
import OnlineStatus from "./OnlineStatus";

// matchQuality -> Tailwind badge classes
const QUALITY_STYLE = {
  "Excellent match": "bg-emerald-600 text-white",
  "Good match": "bg-blue-600 text-white",
  "Fair match": "bg-amber-400 text-slate-900",
  "Low match": "bg-red-600 text-white",
};

// Mirrors MATCH_WEIGHT in Backend/services/matching.service.js.
const BREAKDOWN_CATEGORIES = [
  { key: "activity", label: "Activity", max: 30, appliesWhen: (f) => !!f.activity },
  { key: "location", label: "Location", max: 20, appliesWhen: (f) => !!f.city },
  { key: "availability", label: "Availability", max: 25, appliesWhen: (f) => !!f.day },
  { key: "skill", label: "Skill level", max: 15, appliesWhen: (f) => !!f.skillLevel },
  { key: "rating", label: "Rating", max: 10, appliesWhen: () => true },
];

// Per-category severity bg color
const severityBg = (ratio) => {
  if (ratio >= 0.75) return "bg-emerald-600";
  if (ratio >= 0.5) return "bg-amber-400";
  if (ratio >= 0.25) return "bg-orange-500";
  return "bg-red-600";
};

const Meter = ({ label, value, max, applicable, hint }) => {
  const ratio = applicable ? Math.min(value / max, 1) : 0;

  return (
    <div className="flex items-center gap-2.5 py-1" title={applicable ? undefined : hint}>
      <span className="w-23 text-xs text-slate-600 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
        {applicable && (
          <div
            className={`h-full rounded-full ${severityBg(ratio)}`}
            style={{ width: `${ratio * 100}%` }}
          />
        )}
      </div>
      <span
        className={`w-12 text-right text-xs shrink-0 tabular-nums ${
          applicable ? "text-slate-600" : "text-slate-400"
        }`}
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
  const qualityClass = QUALITY_STYLE[matchQuality] || "bg-slate-200 text-slate-900";
  const name = profile.user?.name || profile.user?.email || "Unknown";
  const initial = name.charAt(0).toUpperCase();
  const userId = profile.user?._id;

  return (
    <div className="relative bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
      {rank <= 3 && (
        <span className="absolute top-4 right-5 text-[11px] font-bold text-slate-400">
          #{rank}
        </span>
      )}

      <div className="flex gap-3.5 items-start">
        <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-base shrink-0">
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-900">{name}</div>
          <div className="text-xs text-slate-600 mt-0.5">
            {profile.skillLevel} · {profile.location?.city || "city not set"} ·{" "}
            {(profile.activities || []).map((a) => a.name).join(", ") || "no activities listed"}
          </div>
          <div className="mt-1">
            <OnlineStatus userId={userId} />
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-3xl font-bold text-slate-900 leading-none">
            {matchScore}
            <span className="text-base font-semibold text-slate-400">%</span>
          </div>
          <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${qualityClass}`}>
            {matchQuality}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-200">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
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

      <div className="mt-4 flex gap-2 justify-end items-center">
        <Link
          to={`/chat/${userId}?name=${encodeURIComponent(name)}`}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors no-underline"
        >
          Message
        </Link>
        <button
          type="button"
          onClick={onSendRequest}
          disabled={requestState === "sending" || requestState === "sent"}
          className={`px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed ${
            requestState === "sent"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : requestState === "sending"
              ? "bg-blue-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {requestState === "sent" ? "Request sent" : requestState === "sending" ? "Sending..." : "Send request"}
        </button>
      </div>

      {requestState && !["sending", "sent"].includes(requestState) && (
        <div className="mt-1.5 text-right text-xs text-red-600">{requestState}</div>
      )}
    </div>
  );
};

export default MatchCard;
