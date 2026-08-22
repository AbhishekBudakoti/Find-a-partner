import React from "react";
import NotificationPanel from "./NotificationPanel";
import { useSocket } from "../context/SocketContext";

export const NotificationTest = () => {
  const {
    notifications,
    unreadNotificationCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useSocket();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2>Notifications Center ({unreadNotificationCount} Unread)</h2>
        <NotificationPanel />
      </div>

      <div style={{ marginBottom: "15px", display: "flex", gap: "10px" }}>
        <button onClick={fetchNotifications} style={{ padding: "8px 16px", cursor: "pointer" }}>
          Refresh Notifications
        </button>
        <button onClick={markAllAsRead} style={{ padding: "8px 16px", cursor: "pointer" }}>
          Mark All as Read
        </button>
      </div>

      {notifications.length === 0 ? (
        <p>No notifications found.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {notifications.map((notif) => (
            <li
              key={notif._id}
              onClick={() => !notif.isRead && markAsRead(notif._id)}
              style={{
                border: "1px solid #ccc",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "10px",
                backgroundColor: notif.isRead ? "#f9f9f9" : "#e6f7ff",
                cursor: notif.isRead ? "default" : "pointer",
              }}
            >
              <div>
                <strong>From:</strong> {notif.sender?.name || notif.sender?.email || "System"}
              </div>
              <div>
                <strong>Type:</strong> {notif.type}
              </div>
              <div>
                <strong>Message:</strong> {notif.message}
              </div>
              <div>
                <small>
                  {new Date(notif.createdAt).toLocaleString()} | Status:{" "}
                  {notif.isRead ? "Read" : "Unread"}
                </small>
              </div>
              {!notif.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notif._id);
                  }}
                  style={{ marginTop: "8px", padding: "4px 8px", cursor: "pointer" }}
                >
                  Mark as Read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationTest;
