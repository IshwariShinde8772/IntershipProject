import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
let accessToken = null;
let onUnauthorized = null;
let refreshPromise = null;

export const authApi = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 5000
});

export const setAccessToken = (token) => {
  accessToken = token;
  if (typeof window !== "undefined") {
    window.__accessToken = token;
  }
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
  accessToken = null;
  if (typeof window !== "undefined") {
    window.__accessToken = null;
  }
};

export const registerUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 5000
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? "";
    const isAuthRequest =
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/student-signup") ||
      requestUrl.includes("/auth/logout") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/reset-password");

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        refreshPromise ??= authApi.post("/auth/refresh");
        const refreshResponse = await refreshPromise;
        refreshPromise = null;
        setAccessToken(refreshResponse.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearAccessToken();
        if (onUnauthorized) {
          onUnauthorized();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
