import axios from "axios";

/**
 * Base URL of the backend REST API, e.g. "http://localhost:3000/api".
 * Configured via VITE_API_URL so it can differ between dev/staging/prod
 * without touching source.
 */
export const API_URL = import.meta.env.VITE_API_URL;

/**
 * Origin the backend (and its Socket.io server) is served from, derived by
 * stripping the trailing "/api" from API_URL. Used for the Socket.io client,
 * which connects to the server root rather than an API path.
 */
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

/**
 * Event fired on `window` when the backend reports the account is suspended.
 * AuthContext listens for it and signs the user out.
 */
export const SUSPENDED_EVENT = "auth:suspended";

/**
 * Shared Axios instance for all backend requests. Sends cookies with every
 * request so the httpOnly auth cookie set by /auth/login is included.
 */
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// A suspension can land mid-session (an admin acts while the user is browsing),
// so any request may be the one that discovers it.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status, data } = error.response || {};
    if (status === 403 && data?.code === "ACCOUNT_SUSPENDED") {
      window.dispatchEvent(new CustomEvent(SUSPENDED_EVENT, { detail: { message: data.message } }));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
