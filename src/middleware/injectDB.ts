import { Context, MiddlewareHandler, Next } from "hono";
import * as schema from "../schema";
import { drizzle } from "drizzle-orm/d1";

export async function injectDB(c: Context, next: Next): Promise<void> {
    const env: Env = c.env;
    c.set("db", drizzle<typeof schema>(env.DB, { schema }));

    await next();
}
