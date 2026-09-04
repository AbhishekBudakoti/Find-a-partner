import { useParams, useSearchParams } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";

const Chat = () => {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const userName = searchParams.get("name") || "Chat";

  return (
    <div style={{ maxWidth: "500px", margin: "24px auto", padding: "0 16px" }}>
      <ChatWindow userId={userId} userName={userName} />
    </div>
  );
};

export default Chat;
