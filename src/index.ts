import { OpenAPIRouter } from "@cloudflare/itty-router-openapi";
import { UserCorkboardFetch } from "endpoints/user/userCorkboardFetch";
import { RandomPhraseFetch } from "endpoints/randomPhraseFetch";
import { UserAchievementFetch } from "endpoints/user/achievements/userAchievementFetch";
import { UserAchievementList } from "endpoints/user/achievements/userAchievementList";

export const router = OpenAPIRouter({
  docs_url: "/",
});

router.get("/api/phrase", RandomPhraseFetch);
router.get("/api/user/:userSlug/corkboard", UserCorkboardFetch);
router.get("/api/user/:userSlug/achievements", UserAchievementList)
router.get("/api/user/:userSlug/achievements/:achievementSlug", UserAchievementFetch)

// 404 for everything else
router.all("*", () =>
  Response.json(
    {
      success: false,
      error: "Route not found",
    },
    { status: 404 }
  )
);

export default {
  fetch: router.handle,
};
