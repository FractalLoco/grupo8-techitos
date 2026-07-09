import dotenv from "dotenv";

export const API_BASE = import.meta.env.VITE_URL_BACKEND || import.meta.env.URL_BACKEND;

if (!API_BASE) {
    throw new Error("API no proporcionada");
}

export default API_BASE;