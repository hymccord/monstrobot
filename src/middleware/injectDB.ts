import { Context, MiddlewareHandler, Next } from "hono";
import * as schema from "../schema";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";

declare module "hono" {
    interface ContextVariableMap {
        db: DrizzleD1Database<typeof schema>;
    }
}

export async function injectDB(c: Context, next: Next): Promise<void> {
    const env: Env = c.env;
    c.set("db", drizzle<typeof schema>(env.DB, { schema }));

    await next();
}

export function getDB(c: Context) {
    return c.get("db");
}
