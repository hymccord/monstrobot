import {
    DataOf,
    Enumeration,
    Header,
    Num,
    OpenAPIRoute,
    OpenAPIRouteSchema,
    Path,
    Query,
    Str,
} from "@cloudflare/itty-router-openapi";
import { z } from "zod";
import { Achievement, AchievementStatus, AllAchievementStatus, RandomPhrase } from "types";
import { generateSlug } from "random-word-slugs";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { UserAchievementService } from "services/userAchievementService";

export class UserAchievementList extends OpenAPIRoute {
    static schema = {
        tags: ["User", "Achievements"],
        parameters: {
            userSlug: Path(Num, {
                description: "Profile id slug",
            }),
            hgToken: Header(Str, {
                description:
                    "HitGrab session token required for API authorization",
                required: true,
            }),
            uniqueHash: Header(Str, {
                description: "Unique hash required for API authorization",
                required: true,
            }),
        },
        responses: {
            "200": {
                description: "",
                schema: AchievementStatus,
            },
            "400": {
                description: "Bad request",
            }
        },
    };

    async handle(
        request: Request,
        env: any,
        context: any,
        data: DataOf<typeof UserAchievementList.schema>
    ) {
        const apiClient = new MouseHuntApiClient();

        const { userSlug } = data.params;
        const achievementService = new UserAchievementService(
            apiClient,
            data.headers
        );

        const snuid = await apiClient.getUserSnuid(data.headers, userSlug);

        const achievementRecord = {
            "star": await achievementService.HasCaughtAllLocationMice(snuid),
            "crown": await achievementService.HasBronzedAllMice(snuid),
            "checkmark": await achievementService.HasAllItems(snuid),
            "egg": await achievementService.IsEggMaster(snuid),
        }

        const results = await AllAchievementStatus.parseAsync({
            id: userSlug,
            snuid: snuid,
            achievements: achievementRecord
        })

        return results;
    }
}
