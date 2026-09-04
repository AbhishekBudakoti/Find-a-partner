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
 * Shared Axios instance for all backend requests. Sends cookies with every
 * request so the httpOnly auth cookie set by /auth/login is included.
 */
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default apiClient;
