import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import apiClient, { SOCKET_URL } from "../api/client";

/**
 * SocketContext provides a global React context for WebSocket real-time capabilities,
 * including connection management, user presence, notifications, and instant messaging.
 */
const SocketContext = createContext(null);

/**
 * SocketProvider component manages the Socket.io connection lifecycle,
 * state synchronization for online users, notification handling, and chat message events.
 *
 * @param {Object} props - React component props.
 * @param {React.ReactNode} props.children - Child components to be wrapped by the provider.
 */
export const SocketProvider = ({ children }) => {
  // Active Socket.io client instance
  const [socket, setSocket] = useState(null);

  // Set containing user IDs of currently online users
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Boolean indicating whether the WebSocket client is currently connected
  const [connected, setConnected] = useState(false);

  // Array of user notification objects
  const [notifications, setNotifications] = useState([]);

  // Counter for unread notifications
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Array of real-time chat messages
  const [chatMessages, setChatMessages] = useState([]);


  const [typingUsers, setTypingUsers] = useState(new Set());


  const startTyping = (recipientId) => {
    if (!socket || !connected || !recipientId) return;

    socket.emit("chat:typing", {
      recipientId,
    });
  };

  const stopTyping = (recipientId) => {
    if (!socket || !connected || !recipientId) return;

    socket.emit("chat:stop_typing", {
      recipientId,
    });
  };

  /**
   * Fetches initial notifications and unread count from the backend REST API endpoint.
   */
  const fetchNotifications = async () => {
    try {
      const { data } = await apiClient.get("/notifications");
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadNotificationCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  /**
   * Marks a single notification as read by notification ID.
   * Updates local state upon successful response from backend API.
   *
   * @param {string} notificationId - Unique ID of the notification to mark as read.
   */
  const markAsRead = async (notificationId) => {
    try {
      const { data } = await apiClient.patch(
        `/notifications/${notificationId}/read`
      );
      if (data.success) {
        // Mark notification as read in local state
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );

        // Update unread count based on API response or fallback decrement
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

  /**
   * Marks all notifications as read for the authenticated user via REST API.
   */
  const markAllAsRead = async () => {
    try {
      const { data } = await apiClient.patch("/notifications/read-all");
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

  // Setup WebSocket connection and event listeners on mount
  useEffect(() => {
    // Instantiate Socket.io client
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
    });
    setSocket(newSocket);

    // --- CONNECTION HANDLERS ---

    // Triggered when socket connects successfully
    newSocket.on("connect", () => {
      console.log("Socket Connected:", newSocket.id);
      setConnected(true);
      fetchNotifications();
    });

    // Triggered when socket disconnects
    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnect:", reason);
      setConnected(false);
      setOnlineUsers(new Set());
    });

    // Triggered on connection error
    newSocket.on("connect_error", (error) => {
      console.log("Socket connection error:", error.message);
    });

    // --- PRESENCE HANDLERS ---

    // Initial snapshot of online users received from server
    newSocket.on("presence:initial", (data) => {
      console.log("Initial online users:", data.onlineUserIds);
      setOnlineUsers(new Set(data.onlineUserIds));
    });

    // User status update: User comes online
    newSocket.on("presence:online", (data) => {
      setOnlineUsers((previousUsers) => {
        const updatedUsers = new Set(previousUsers);
        updatedUsers.add(data.userId);
        return updatedUsers;
      });
    });

    // User status update: User goes offline
    newSocket.on("presence:offline", (data) => {
      setOnlineUsers((previousUsers) => {
        const updatedUsers = new Set(previousUsers);
        updatedUsers.delete(data.userId);
        return updatedUsers;
      });
    });

    // --- NOTIFICATION HANDLERS ---

    // Real-time notification received from server
    newSocket.on("notification:new", (data) => {
      console.log("Notification received via socket:", data);
      const newNotif = data.notification;
      if (!newNotif) return;

      // Avoid adding duplicate notifications
      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === newNotif._id);
        if (exists) return prev;
        return [newNotif, ...prev];
      });
      setUnreadNotificationCount((prev) => prev + 1);
    });

    // --- CHAT EVENT HANDLERS ---

    // Incoming chat message sent by another user
    newSocket.on("chat:receive_message", (data) => {
      console.log("Chat message received:", data.message);

      if (!data.message) return;

      setChatMessages((previousMessage) => [
        ...previousMessage,
        data.message,
      ]);
    });

    // Confirmation of chat message sent by current user
    newSocket.on("chat:message_sent", (data) => {
      console.log("Chat message sent:", data.message);

      if (!data.message) return;

      setChatMessages((previousMessage) => [
        ...previousMessage,
        data.message,
      ]);
    });

    // Chat error received from server
    newSocket.on("chat:error", (data) => {
      console.error("Chat error:", data.message);
    });


    newSocket.on("chat:typing", (data) => {
      if (!data.userId) return;

      setTypingUsers((previousUsers) => {
        const updatedUsers = new Set(previousUsers)

        updatedUsers.add(data.userId);

        return updatedUsers;
      })
    })

    newSocket.on("chat:stop_typing", (data) => {
      if (!data.userId) return;

      setTypingUsers((previousUsers) => {
        const updatedUsers = new Set(previousUsers);
        updatedUsers.delete(data.userId);
        return updatedUsers
      })
    })

    // Clean up socket instance on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  /**
   * Manually reconnects the socket client if disconnected.
   */
  const connectSocket = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  };

  /**
   * Manually disconnects the active socket connection.
   */
  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
    }
  };

  /**
   * Sends a real-time chat message to a specific recipient via WebSocket.
   *
   * @param {string} recipientId - The ID of the message recipient.
   * @param {string} content - Message text content.
   */
  const sendMessage = (recipientId, content) => {
    if (!socket || !connected) {
      console.log("Socket not connected");
      return;
    }

    socket.emit("chat:send_message", { recipientId, content });
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
        chatMessages,
        sendMessage,
          typingUsers,
    startTyping,
    stopTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Custom hook to consume the SocketContext.
 *
 * @returns {Object} Access to socket state, online user set, notifications, and messaging methods.
 */
export const useSocket = () => {
  return useContext(SocketContext);
};

/**
 * Custom hook to check whether a given user is currently online.
 *
 * @param {string|number} userId - The user ID to inspect.
 * @returns {boolean} True if the user is online, false otherwise.
 */
export const useUserOnline = (userId) => {
  const context = useSocket();
  const onlineUsers = context?.onlineUsers;

  if (!userId || !onlineUsers) {
    return false;
  }

  return onlineUsers.has(userId.toString());
};