import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/notifications", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadNotificationCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );
        if (typeof data.data.unreadCount === "number") {
          setUnreadNotificationCount(data.data.unreadCount);
        } else {
          setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/notifications/read-all",
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadNotificationCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  useEffect(() => {
    const newSocket = io("http://localhost:3000", {
      withCredentials: true,
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket Connected:", newSocket.id);
      setConnected(true);
      fetchNotifications();
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnect:", reason);
      setConnected(false);
      setOnlineUsers(new Set());
    });

    newSocket.on("connect_error", (error) => {
      console.log("Socket connection error:", error.message);
    });

    newSocket.on("presence:initial", (data) => {
      console.log("Initial online users:", data.onlineUserIds);
      setOnlineUsers(new Set(data.onlineUserIds));
    });

    newSocket.on("presence:online", (data) => {
      setOnlineUsers((previousUsers) => {
        const updatedUsers = new Set(previousUsers);
        updatedUsers.add(data.userId);
        return updatedUsers;
      });
    });

    newSocket.on("presence:offline", (data) => {
      setOnlineUsers((previousUsers) => {
        const updatedUsers = new Set(previousUsers);
        updatedUsers.delete(data.userId);
        return updatedUsers;
      });
    });

    newSocket.on("notification:new", (data) => {
      console.log("Notification received via socket:", data);
      const newNotif = data.notification;
      if (!newNotif) return;

      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === newNotif._id);
        if (exists) return prev;
        return [newNotif, ...prev];
      });
      setUnreadNotificationCount((prev) => prev + 1);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const connectSocket = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        onlineUsers,
        connectSocket,
        disconnectSocket,
        notifications,
        unreadNotificationCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};

export const useUserOnline = (userId) => {
  const context = useSocket();
  const onlineUsers = context?.onlineUsers;

  if (!userId || !onlineUsers) {
    return false;
  }

  return onlineUsers.has(userId.toString());
};