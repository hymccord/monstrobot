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
import { Achievement, AchievementStatus, RandomPhrase } from "types";
import { generateSlug } from "random-word-slugs";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { UserAchievementService } from "services/userAchievementService";

export class UserAchievementFetch extends OpenAPIRoute {
    static schema = {
        tags: ["User", "Achievements"],
        parameters: {
            userSlug: Path(Num, {
                description: "Profile id slug",
            }),
            achievementSlug: Path(Enumeration, {
                values: {
                    star: "star",
                    crown: "crown",
                    egg: "egg",
                    checkmark: "checkmark",
                },
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
        data: DataOf<typeof UserAchievementFetch.schema>
    ) {
        const apiClient = new MouseHuntApiClient();

        const { userSlug, achievementSlug } = data.params;
        const achievementService = new UserAchievementService(
            apiClient,
            data.headers
        );

        let complete = false;

        const snuid = await apiClient.getUserSnuid(data.headers, userSlug);
        switch (achievementSlug) {
            case "star":
                complete = await achievementService.HasCaughtAllLocationMice(snuid);
                break;
            case "crown":
                complete = await achievementService.HasBronzedAllMice(snuid);
                break;
            case "checkmark":
                complete = await achievementService.HasAllItems(snuid);
                break;
            case "egg":
                complete = await achievementService.IsEggMaster(snuid);
                break;
            default:
                return Response.json(
                    {
                        success: false,
                        error: "Invalid achievement",
                    },
                    {
                        status: 400,
                    }
                );
                break;
        }

        const results = await AchievementStatus.parseAsync({
            achievement: achievementSlug,
            complete: complete
        })

        return results;
    }
}
