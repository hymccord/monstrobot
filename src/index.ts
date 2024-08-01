import { fromHono } from "chanfana";
import { Hono } from "hono";
import { RandomPhraseFetch } from "endpoints/randomPhraseFetch";
import { UserAchievementFetch } from "endpoints/user/achievements/userAchievementFetch";
import { UserAchievementList } from "endpoints/user/achievements/userAchievementList";
import { UserCorkboardFetch } from "endpoints/user/corkboard/userCorkboardFetch";
import { UserCrownList } from "endpoints/user/crown/userCrownList";
import { UserCrownPowerFetch } from "endpoints/user/crown/userCrownPowerFetch";
import { UserCrownPowerTypeFetch } from "endpoints/user/crown/userCrownPowerTypeFetch";
import { UserInfoFetch } from "endpoints/user/userInfoFetch";

const app = new Hono();

const openapi = fromHono(app, {
    docs_url: "/",
});

openapi.get("/api/phrase", RandomPhraseFetch);
openapi.get("/api/user/:userSlug", UserInfoFetch);
openapi.get("/api/user/:userSlug/corkboard", UserCorkboardFetch);

openapi.get("/api/user/:userSlug/achievements", UserAchievementList);
openapi.get("/api/user/:userSlug/achievements/:achievementSlug", UserAchievementFetch);

openapi.get("/api/user/:userSlug/crowns", UserCrownList);
openapi.get("/api/user/:userSlug/crowns/:powerTypeSlug", UserCrownPowerFetch);
openapi.get("/api/user/:userSlug/crowns/:powerTypeSlug/:crownTypeSlug", UserCrownPowerTypeFetch);

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
