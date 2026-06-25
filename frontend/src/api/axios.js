import axios from 'axios';
const RESOURCES_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export default axios.create({
  baseURL: RESOURCES_URL,
});

export const axiosPrivate = axios.create({
  baseURL: RESOURCES_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});