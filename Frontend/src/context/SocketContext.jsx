import { createContext, useContext, useEffect, useState } from "react";

import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io("http://localhost:3000", {
      withCredentials: true,
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket Connected:", newSocket.id);
      setConnected(true);
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
    <SocketContext.Provider value={{ socket, connected, onlineUsers, connectSocket, disconnectSocket }}>
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