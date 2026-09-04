import React, { useState } from "react";
import { useSocket } from "../context/SocketContext";

/**
 * NotificationPanel component renders a floating bell button with unread count badge
 * and an interactive dropdown panel displaying user notifications.
 */
export const NotificationPanel = () => {
  // Toggle state for displaying the notifications dropdown panel
  const [isOpen, setIsOpen] = useState(false);

  // Consume notification state and action handlers from SocketContext
  const {
    notifications,
    unreadNotificationCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useSocket();

  /**
   * Toggles the open/closed state of the notification dropdown panel.
   */
  const togglePanel = () => {
    setIsOpen((prev) => !prev);
  };

  /**
   * Handles user click on an individual notification item.
   * Marks the notification as read if it hasn't been read yet.
   *
   * @param {Object} notification - The clicked notification item.
   */
  const handleItemClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block", fontFamily: "sans-serif" }}>
      {/* Notification Bell Button */}
      <button
        onClick={togglePanel}
        aria-label="Notifications"
        style={{
          position: "relative",
          background: "#1e293b",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: "42px",
          height: "42px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          transition: "background 0.2s ease",
        }}
      >
        {/* Bell Icon SVG */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>

        {/* Unread Badge */}
        {unreadNotificationCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              backgroundColor: "#ef4444",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "bold",
              borderRadius: "10px",
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 2px #ffffff",
            }}
          >
            {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "50px",
            width: "360px",
            maxWidth: "90vw",
            maxHeight: "480px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            border: "1px solid #e2e8f0",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>
                Notifications
              </h3>
              {unreadNotificationCount > 0 && (
                <span
                  style={{
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    fontSize: "12px",
                    fontWeight: "600",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  {unreadNotificationCount} new
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={fetchNotifications}
                title="Refresh"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                }}
              >
                ↻
              </button>
              {unreadNotificationCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#2563eb",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div
            style={{
              overflowY: "auto",
              flex: 1,
              padding: "8px",
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: "14px",
                }}
              >
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.isRead;
                const senderName = notif.sender?.name || notif.sender?.email || "Someone";

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleItemClick(notif)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      marginBottom: "6px",
                      backgroundColor: isUnread ? "#f0f9ff" : "#ffffff",
                      border: isUnread ? "1px solid #bae6fd" : "1px solid #f1f5f9",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: isUnread ? "#0369a1" : "#475569",
                        }}
                      >
                        {senderName}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#94a3b8",
                        }}
                      >
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: isUnread ? "#0f172a" : "#334155",
                        fontWeight: isUnread ? "500" : "normal",
                        lineHeight: "1.4",
                      }}
                    >
                      {notif.message}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "2px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#64748b",
                          backgroundColor: "#f1f5f9",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {notif.type ? notif.type.replace("_", " ") : "Notification"}
                      </span>

                      {isUnread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif._id);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#0284c7",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
