import React from "react";
import { useUserOnline } from "../context/SocketContext";

/**
 * OnlineStatus component renders a visual status indicator (online / offline)
 * for a specific user based on real-time presence data from SocketContext.
 *
 * @param {Object} props - React component props.
 * @param {string|number} props.userId - The ID of the user whose online status to display.
 */
export const OnlineStatus = ({ userId }) => {
  const isOnline = useUserOnline(userId);

  return (
    <span style={{ fontSize: "14px", fontWeight: "500", color: isOnline ? "#22c55e" : "#94a3b8" }}>
      {isOnline ? "● Online" : "○ Offline"}
    </span>
  );
};

export default OnlineStatus;




