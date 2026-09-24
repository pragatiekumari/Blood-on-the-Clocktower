/**
 * Base URL of the game server. In dev, this is empty so requests go through
 * Vite's proxy (see vite.config.ts). In production (e.g. Netlify), set
 * VITE_SERVER_URL to the deployed backend's origin, e.g. https://your-server.onrender.com
 */
export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL ?? '';
