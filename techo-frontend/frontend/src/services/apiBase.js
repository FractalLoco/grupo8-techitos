export const API_BASE = import.meta?.env?.VITE_URL_BACKEND || process?.env?.VITE_URL_BACKEND;

if (!API_BASE) {
    throw new Error("API no proporcionada");
}

export default API_BASE;