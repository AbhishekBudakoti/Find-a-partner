import { useUserOnline } from "../context/PresenceTest"

export const OnlineStatus = ({ userId }) => {
    const isOnline = useUserOnline(userId);

    return (
        <span>
            {isOnline ? "● Online" : "○ Offline"}
        </span>
    )
}



