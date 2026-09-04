import { useEffect, useState } from "react";
import apiClient from "../api/client";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const SKILL_LEVELS = ["beginner", "intermediate", "advanced"];

const cardStyle = {
  maxWidth: "560px",
  margin: "32px auto",
  padding: "24px",
  backgroundColor: "#fff",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
};

const inputStyle = {
  padding: "8px 10px",
  fontSize: "14px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  width: "100%",
  boxSizing: "border-box",
};

const emptyRow = () => ({ day: "monday", startTime: "", endTime: "" });

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [activityOptions, setActivityOptions] = useState([]);

  const [bio, setBio] = useState("");
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [city, setCity] = useState("");
  const [activities, setActivities] = useState([]);
  const [availability, setAvailability] = useState([emptyRow()]);

  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get("/activities");
        setActivityOptions(data.data?.activities || []);
      } catch {
        // Non-fatal — the form still works, just without activity checkboxes populated.
      }

      try {
        const { data } = await apiClient.get("/profile/me");
        const profile = data.data?.profile;
        if (profile) {
          setHasProfile(true);
          setBio(profile.bio || "");
          setSkillLevel(profile.skillLevel || "beginner");
          setCity(profile.location?.city || "");
          setActivities((profile.activities || []).map((a) => a._id || a));
          setAvailability(
            profile.availability?.length
              ? profile.availability.map((a) => ({ day: a.day, startTime: a.startTime, endTime: a.endTime }))
              : [emptyRow()]
          );
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          setErrorMsg("Failed to load profile");
        }
        setHasProfile(false);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const toggleActivity = (id) => {
    setActivities((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const updateRow = (index, field, value) => {
    setAvailability((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setAvailability((prev) => [...prev, emptyRow()]);
  const removeRow = (index) => setAvailability((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setStatusMsg("");
    setSaving(true);

    const payload = {
      bio,
      skillLevel,
      activities,
      location: { city },
      availability: availability.filter((row) => row.startTime && row.endTime),
    };

    try {
      if (hasProfile) {
        await apiClient.patch("/profile/me", payload);
        setStatusMsg("Profile updated");
      } else {
        await apiClient.post("/profile", payload);
        setHasProfile(true);
        setStatusMsg("Profile created");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading profile...</div>;
  }

  return (
    <div style={cardStyle}>
      <h1 style={{ fontSize: "20px", marginTop: 0, color: "#0f172a" }}>
        {hasProfile ? "Your profile" : "Create your profile"}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <label style={{ fontSize: "13px", color: "#475569" }}>
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            style={{ ...inputStyle, marginTop: "4px", resize: "vertical" }}
          />
        </label>

        <label style={{ fontSize: "13px", color: "#475569" }}>
          Skill level
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            style={{ ...inputStyle, marginTop: "4px" }}
          >
            {SKILL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: "13px", color: "#475569" }}>
          City
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={{ ...inputStyle, marginTop: "4px" }}
          />
        </label>

        <div>
          <span style={{ fontSize: "13px", color: "#475569" }}>Activities</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "6px" }}>
            {activityOptions.length === 0 && (
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>No activities available yet.</span>
            )}
            {activityOptions.map((activity) => (
              <label
                key={activity._id}
                style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#334155" }}
              >
                <input
                  type="checkbox"
                  checked={activities.includes(activity._id)}
                  onChange={() => toggleActivity(activity._id)}
                />
                {activity.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span style={{ fontSize: "13px", color: "#475569" }}>Availability</span>
          {availability.map((row, index) => (
            <div key={index} style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
              <select
                value={row.day}
                onChange={(e) => updateRow(index, "day", e.target.value)}
                style={{ ...inputStyle, width: "130px" }}
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={row.startTime}
                onChange={(e) => updateRow(index, "startTime", e.target.value)}
                style={{ ...inputStyle, width: "110px" }}
              />
              <input
                type="time"
                value={row.endTime}
                onChange={(e) => updateRow(index, "endTime", e.target.value)}
                style={{ ...inputStyle, width: "110px" }}
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            style={{
              marginTop: "8px",
              fontSize: "13px",
              border: "1px dashed #94a3b8",
              background: "none",
              borderRadius: "6px",
              padding: "6px 10px",
              cursor: "pointer",
              color: "#475569",
            }}
          >
            + Add time slot
          </button>
        </div>

        {errorMsg && <span style={{ fontSize: "13px", color: "#dc2626" }}>{errorMsg}</span>}
        {statusMsg && <span style={{ fontSize: "13px", color: "#16a34a" }}>{statusMsg}</span>}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "#2563eb",
            border: "none",
            borderRadius: "6px",
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : hasProfile ? "Save changes" : "Create profile"}
        </button>
      </form>
    </div>
  );
};

export default Profile;
