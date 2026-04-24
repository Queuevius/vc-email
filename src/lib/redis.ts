import { Redis } from "@upstash/redis";

export function getRedisClient(): Redis | null {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn("Redis: Upstash credentials missing.", { 
            hasUrl: !!url, 
            hasToken: !!token 
        });
        return null;
    }

    try {
        return new Redis({ url, token });
    } catch (err) {
        console.error("Redis: Failed to initialize client:", err);
        return null;
    }
}
