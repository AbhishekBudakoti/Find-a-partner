import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import apiClient from "../api/client";

const ChatWindow = ({ userId, userName }) => {
    const {
        chatMessages,
        sendMessage,
        connected,
        typingUsers,
        startTyping,
        stopTyping,
    } = useSocket();

    const [message, setMessage] = useState("");
    const [history, setHistory] = useState([]);
    const [authError, setAuthError] = useState(false);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const isOtherUserTyping = typingUsers?.has(userId);

    // Fetch chat history and mark messages as read
    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                const { data } = await apiClient.get(`/chat/${userId}`);

                setAuthError(false);
                setHistory(data.data.messages || data.data.message || []);

                // Mark received messages as read
                try {
                    await apiClient.patch(`/chat/${userId}/read`);
                    console.log("Messages marked as read");
                } catch (readError) {
                    console.error(
                        "Failed to mark messages as read:",
                        readError.response?.data?.message || readError.message
                    );
                }
            } catch (error) {
                if (error.response?.status === 401) {
                    setAuthError(true);
                }
                console.error("Chat history error:", error);
            }
        };

        if (userId) {
            fetchChatHistory();
        }
    }, [userId]);

    // Add new real-time messages
    useEffect(() => {
        if (!userId) return;

        const newMessages = chatMessages.filter((msg) => {
            const senderId = msg.sender?._id || msg.sender;
            const recipientId = msg.recipient?._id || msg.recipient;

            return (
                senderId?.toString() === userId.toString() ||
                recipientId?.toString() === userId.toString()
            );
        });

        setHistory((previousMessages) => {
            const existingIds = new Set(
                previousMessages.map((item) => item._id)
            );

            const uniqueMessages = newMessages.filter(
                (item) => !existingIds.has(item._id)
            );

            if (uniqueMessages.length === 0) {
                return previousMessages;
            }

            return [...previousMessages, ...uniqueMessages];
        });
    }, [chatMessages, userId]);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [history, isOtherUserTyping]);

    // Cleanup typing timer when component unmounts
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            if (userId) {
                stopTyping(userId);
            }
        };
    }, [userId]);

    const handleSendMessage = (event) => {
        event.preventDefault();

        const trimmedMessage = message.trim();

        if (!trimmedMessage) return;

        if (!connected) {
            console.error("Socket is not connected");
            return;
        }

        // Stop typing immediately
        stopTyping(userId);

        // Clear pending typing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        // Send message
        sendMessage(userId, trimmedMessage);

        // Clear input
        setMessage("");
    };

    const handleTyping = (event) => {
        const value = event.target.value;

        setMessage(value);

        // Empty input = stop typing
        if (!value.trim()) {
            stopTyping(userId);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }

            return;
        }

        // Tell recipient that user is typing
        startTyping(userId);

        // Clear previous timer
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Automatically stop typing after 1.5 seconds
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping(userId);
            typingTimeoutRef.current = null;
        }, 1500);
    };

    const handleInputBlur = () => {
        stopTyping(userId);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    };

    return (
        <div
            style={{
                width: "100%",
                maxWidth: "500px",
                border: "1px solid #ddd",
                borderRadius: "10px",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: "15px",
                    borderBottom: "1px solid #ddd",
                }}
            >
                <strong>{userName || "Chat"}</strong>

                <div>
                    <small>
                        {connected
                            ? "Online connection"
                            : "Disconnected"}
                    </small>
                </div>
            </div>

            {authError && (
                <div
                    style={{
                        padding: "10px 15px",
                        backgroundColor: "#fef2f2",
                        color: "#991b1b",
                        fontSize: "13px",
                        borderBottom: "1px solid #fecaca",
                    }}
                >
                    🔒 Authentication required. Please log in using the header above.
                </div>
            )}

            {/* Messages */}
            <div
                style={{
                    height: "400px",
                    overflowY: "auto",
                    padding: "15px",
                }}
            >
                {history.length === 0 ? (
                    <p>No messages yet.</p>
                ) : (
                    history.map((item) => {
                        const senderId =
                            item.sender?._id || item.sender;

                        const isOwnMessage =
                            senderId?.toString() !==
                            userId.toString();

                        return (
                            <div
                                key={item._id}
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        isOwnMessage
                                            ? "flex-end"
                                            : "flex-start",
                                    marginBottom: "10px",
                                }}
                            >
                                <div
                                    style={{
                                        padding: "8px 12px",
                                        borderRadius: "10px",
                                        maxWidth: "70%",
                                        background:
                                            isOwnMessage
                                                ? "#dbeafe"
                                                : "#f1f1f1",
                                    }}
                                >
                                    {item.content}
                                </div>
                            </div>
                        );
                    })
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {isOtherUserTyping && (
                <div
                    style={{
                        padding: "0 15px 8px",
                        fontSize: "13px",
                        color: "#64748b",
                        fontStyle: "italic",
                    }}
                >
                    {userName || "User"} is typing...
                </div>
            )}

            {/* Input */}
            <form
                onSubmit={handleSendMessage}
                style={{
                    display: "flex",
                    gap: "8px",
                    padding: "10px",
                    borderTop: "1px solid #ddd",
                }}
            >
                <input
                    type="text"
                    value={message}
                    onChange={handleTyping}
                    onBlur={handleInputBlur}
                    placeholder="Type a message..."
                    disabled={!connected}
                    style={{
                        flex: 1,
                        padding: "10px",
                    }}
                />

                <button
                    type="submit"
                    disabled={
                        !connected ||
                        !message.trim()
                    }
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;