// Central API client with auth token injection
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

client.interceptors.request.use((config) => {
  const t = localStorage.getItem("agriscan_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default client;

export const buildFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api/")) return `${BACKEND_URL}${path}`;
  return `${API}${path.startsWith("/") ? "" : "/"}${path}`;
};
