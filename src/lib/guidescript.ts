import { Redis } from "@upstash/redis";
import { getRedisClient } from "./redis";

const REDIS_KEY = "guidescript";


export class GuidescriptService {
    async getGuidescript(): Promise<string> {
        try {
            const redis = getRedisClient();
            if (redis) {
                const stored = await redis.get<string>(REDIS_KEY);
                if (stored) return stored;
            }
        } catch (err) {
            console.error("Redis read error, falling back to env:", err);
        }

        // Fallback to environment variable
        return process.env.GUIDESCRIPT || "";
    }

    async setGuidescript(content: string): Promise<void> {
        const redis = getRedisClient();
        if (!redis) {
            throw new Error(
                "Upstash Redis is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables."
            );
        }
        await redis.set(REDIS_KEY, content);
    }
}
