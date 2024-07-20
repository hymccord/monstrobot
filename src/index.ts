import { fromHono } from "chanfana";
import { Hono } from "hono";
import { UserCorkboardFetch } from "endpoints/user/corkboard/userCorkboardFetch";
import { RandomPhraseFetch } from "endpoints/randomPhraseFetch";
import { UserAchievementFetch } from "endpoints/user/achievements/userAchievementFetch";
import { UserAchievementList } from "endpoints/user/achievements/userAchievementList";
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
