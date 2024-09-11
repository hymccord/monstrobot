import { Context, Next } from "hono";

export async function apiKeyAuth(c: Context, next: Next) {
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const env: Env = c.env;
    const userId = await env.API_KEYS.get(apiKey);

    if (!userId) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    await next();
}
