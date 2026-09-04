import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";

const statusColor = {
  pending: "#d97706",
  accepted: "#16a34a",
  rejected: "#dc2626",
  cancelled: "#94a3b8",
  expired: "#94a3b8",
};

const RequestRow = ({ request, otherUser, actions }) => (
  <div
    style={{
      padding: "14px 16px",
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
        {otherUser?.name || otherUser?.email || "Unknown user"}{" "}
        <span style={{ fontSize: "12px", fontWeight: 500, color: statusColor[request.status] }}>
          {request.status}
        </span>
      </div>
      {request.message && (
        <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>&ldquo;{request.message}&rdquo;</div>
      )}
    </div>
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {request.status === "accepted" && otherUser && (
        <Link
          to={`/chat/${otherUser._id}?name=${encodeURIComponent(otherUser.name || "")}`}
          style={{ fontSize: "13px", color: "#2563eb" }}
        >
          Chat
        </Link>
      )}
      {actions}
    </div>
  </div>
);

const actionButtonStyle = (bg) => ({
  padding: "6px 12px",
  fontSize: "13px",
  color: "#fff",
  backgroundColor: bg,
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
});

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/requests");
      setRequests(data.data?.requests || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id, action) => {
    setBusyId(id);
    try {
      if (action === "cancel") {
        await apiClient.delete(`/requests/${id}`);
      } else {
        await apiClient.patch(`/requests/${id}/${action}`);
      }
      await load();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || `Failed to ${action} request`);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading requests...</div>;
  }

  const received = requests.filter((r) => r.recipient?._id === user?._id);
  const sent = requests.filter((r) => r.sender?._id === user?._id);

  return (
    <div style={{ maxWidth: "700px", margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "20px", color: "#0f172a" }}>Partner requests</h1>
      {errorMsg && <p style={{ color: "#dc2626" }}>{errorMsg}</p>}

      <h2 style={{ fontSize: "15px", color: "#334155", marginTop: "24px" }}>Received</h2>
      {received.length === 0 && <p style={{ fontSize: "13px", color: "#94a3b8" }}>Nothing here yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {received.map((request) => (
          <RequestRow
            key={request._id}
            request={request}
            otherUser={request.sender}
            actions={
              request.status === "pending" && (
                <>
                  <button
                    type="button"
                    disabled={busyId === request._id}
                    onClick={() => act(request._id, "accept")}
                    style={actionButtonStyle("#16a34a")}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busyId === request._id}
                    onClick={() => act(request._id, "reject")}
                    style={actionButtonStyle("#dc2626")}
                  >
                    Reject
                  </button>
                </>
              )
            }
          />
        ))}
      </div>

      <h2 style={{ fontSize: "15px", color: "#334155", marginTop: "24px" }}>Sent</h2>
      {sent.length === 0 && <p style={{ fontSize: "13px", color: "#94a3b8" }}>Nothing here yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {sent.map((request) => (
          <RequestRow
            key={request._id}
            request={request}
            otherUser={request.recipient}
            actions={
              request.status === "pending" && (
                <button
                  type="button"
                  disabled={busyId === request._id}
                  onClick={() => act(request._id, "cancel")}
                  style={actionButtonStyle("#94a3b8")}
                >
                  Cancel
                </button>
              )
            }
          />
        ))}
      </div>
    </div>
  );
};

export default Requests;
