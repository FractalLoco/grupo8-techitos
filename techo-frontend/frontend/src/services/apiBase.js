import dotenv from 'dotenv';

export const API_BASE = process?.env?.VITE_URL_BACKEND || "http://localhost:3000";

export default API_BASE;