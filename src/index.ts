import { fromHono } from "chanfana";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { injectDB } from "middleware/injectDB";
import { apiKeyAuth } from "middleware/apiKeyAuth";
import { RandomPhraseFetch } from "endpoints/randomPhraseFetch";
import { UserAchievementFetch } from "endpoints/user/achievements/userAchievementFetch";
import { UserAchievementList } from "endpoints/user/achievements/userAchievementList";
import { UserCorkboardFetch } from "endpoints/user/corkboard/userCorkboardFetch";
import { UserCrownList } from "endpoints/user/crown/userCrownList";
import { UserCrownPowerFetch } from "endpoints/user/crown/userCrownPowerFetch";
import { UserCrownPowerTypeFetch } from "endpoints/user/crown/userCrownPowerTypeFetch";
import { UserInfoFetch } from "endpoints/user/userInfoFetch";
import { IdentifyDiscordIdFetch } from "endpoints/identify/identifyDiscordIdFetch";
import { IdentifyMouseHuntIdFetch } from "endpoints/identify/identifyMouseHuntIdFetch";
import { IdentifyCreate } from "endpoints/identify/identifyCreate";
import { IdentifyDiscordIdDelete } from "endpoints/identify/identifyDiscordIdDelete";
import { IdentifyMouseHuntIdDelete } from "endpoints/identify/identifyMouseHuntIdDelete";

const app = new Hono();

const openapi = fromHono(app, {
    docs_url: "/",
});

openapi.use(logger());
openapi.get("/api/phrase", RandomPhraseFetch);
openapi.get("/api/user/:userSlug", UserInfoFetch);
openapi.get("/api/user/:userSlug/corkboard", UserCorkboardFetch);

openapi.get("/api/user/:userSlug/achievements", UserAchievementList);
openapi.get("/api/user/:userSlug/achievements/:achievementSlug", UserAchievementFetch);

openapi.get("/api/user/:userSlug/crowns", UserCrownList);
openapi.get("/api/user/:userSlug/crowns/:powerTypeSlug", UserCrownPowerFetch);
openapi.get("/api/user/:userSlug/crowns/:powerTypeSlug/:crownTypeSlug", UserCrownPowerTypeFetch);

openapi.use("/api/identify/*", apiKeyAuth);
openapi.use("/api/identify/*", injectDB);
openapi.post("/api/identify", IdentifyCreate);
openapi.get("/api/identify/mousehunt/:id", IdentifyMouseHuntIdFetch);
openapi.get("/api/identify/discord/:id", IdentifyDiscordIdFetch);
openapi.delete("/api/identify/mousehunt/:id", IdentifyMouseHuntIdDelete);
openapi.delete("/api/identify/discord/:id", IdentifyDiscordIdDelete);

// 404 for everything else
openapi.all("*", () =>
    Response.json(
        {
            success: false,
            error: "Route not found",
        },
        { status: 404 }
    )
);

export default app;
