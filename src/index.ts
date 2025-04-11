import { fromHono } from "chanfana";
import { Context, Hono, Next } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { sentry } from "@hono/sentry";
import { injectDB } from "middleware/injectDB";

import { RandomPhraseFetch } from "endpoints/randomPhraseFetch";
import { UserAchievementFetch } from "endpoints/user/achievements/userAchievementFetch";
import { UserAchievementList } from "endpoints/user/achievements/userAchievementList";
import { UserCorkboardFetch } from "endpoints/user/corkboard/userCorkboardFetch";
import { UserCrownList } from "endpoints/user/crown/userCrownList";
import { UserCrownPowerFetch } from "endpoints/user/crown/userCrownPowerFetch";
import { UserCrownPowerTypeFetch } from "endpoints/user/crown/userCrownPowerTypeFetch";
import { UserInfoFetch } from "endpoints/user/userInfoFetch";
import { UserJournalSummaryFetch } from "endpoints/user/journal/userJournalSummaryFetch";
import { IdentifyDiscordIdFetch } from "endpoints/identify/identifyDiscordIdFetch";
import { IdentifyMouseHuntIdFetch } from "endpoints/identify/identifyMouseHuntIdFetch";
import { IdentifyCreate } from "endpoints/identify/identifyCreate";
import { IdentifyDiscordIdDelete } from "endpoints/identify/identifyDiscordIdDelete";
import { IdentifyMouseHuntIdDelete } from "endpoints/identify/identifyMouseHuntIdDelete";
import { KingsRewardPost } from "endpoints/kr/KingsRewardPost";

const app = new Hono();

const openapi = fromHono(app, {
    docs_url: "/",
});
openapi.registry.registerComponent(
    'securitySchemes',
    'BearerAuth',
    {
        type: 'http',
        scheme: 'bearer',
    },
);

// Add sentry
openapi.use("/api/*", async (c: Context, next: Next) => {
    const options = {
        environment: c.env.ENVIRONMENT,
    };
    await sentry(options)(c, next);
});
// Add console logging
openapi.use(logger());

openapi.get("/api/phrase", RandomPhraseFetch);
openapi.post("/api/kr/:code", KingsRewardPost);
openapi.get("/api/user/:userSlug", UserInfoFetch);
openapi.get("/api/user/:userSlug/corkboard", UserCorkboardFetch);
openapi.get("/api/user/:userSlug/journalSummary", UserJournalSummaryFetch);

/// Achievements
openapi.get("/api/user/:userSlug/achievements", UserAchievementList);
openapi.get("/api/user/:userSlug/achievements/:achievementSlug", UserAchievementFetch);

/// Crowns
openapi.get("/api/user/:userSlug/crowns", UserCrownList);
openapi.get("/api/user/:userSlug/crowns/:powerTypeSlug", UserCrownPowerFetch);
openapi.get("/api/user/:userSlug/crowns/:powerTypeSlug/:crownTypeSlug", UserCrownPowerTypeFetch);

/// Identify
// Secure the identify endpoints with auth token
openapi.use("/api/identify/*", bearerAuth({
    verifyToken: async (token: string, c: Context) => {
        const env: Env = c.env;
        const userId = await env.API_KEYS.get(token);

        return userId != null;
    }
}));
// Inject the database into the identify endpoints
openapi.use("/api/identify/*", injectDB);

openapi.post("/api/identify", IdentifyCreate);
openapi.get("/api/identify/mousehunt/:id", IdentifyMouseHuntIdFetch);
openapi.get("/api/identify/discord/:id", IdentifyDiscordIdFetch);
openapi.delete("/api/identify/mousehunt/:id", IdentifyMouseHuntIdDelete);
openapi.delete("/api/identify/discord/:id", IdentifyDiscordIdDelete);

// 404 for everything else
openapi.all("*", (c: Context) =>
    c.json({
        success: false,
        error: "Route not found",
    }, 404)
);

app.onError((err: Error, c: Context) => {
    if (err instanceof HTTPException) {
        return c.json({
            success: false,
            error: {
                message: err.message,
                code: err.status,
            },
        }, err.status);
    }
    return c.json({
        success: false,
    }, 500)
});

export default app;
