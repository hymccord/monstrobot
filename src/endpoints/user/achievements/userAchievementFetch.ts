import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { z } from "zod";
import { AchievementStatus } from "types";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { UserAchievementService } from "services/userAchievementService";

export class UserAchievementFetch extends OpenAPIRoute {
    schema = {
        tags: ["User", "Achievements"],
        request: {
            params: z.object({
                userSlug: z.number().describe("Profile id slug"),
                achievementSlug: z.string().describe("Achievement slug"),
            }),
            headers: z.object({
                hgToken: z
                    .string()
                    .describe(
                        "HitGrab session token required for API authorization"
                    ),
                uniqueHash: z
                    .string()
                    .describe("Unique hash required for API authorization"),
            }),
        },
        responses: {
            "200": {
                description: "",
                content: {
                    "application/json": {
                        schema: AchievementStatus,
                    }
                }
            },
            "400": {
                description: "Bad request",
            },
        },
    };

    async handle(c: any) {
        const data = await this.getValidatedData<typeof this.schema>();
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
                complete = await achievementService.HasCaughtAllLocationMice(
                    snuid
                );
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
                return c.json(
                    {
                        success: false,
                        error: "Invalid achievement",
                    },
                    400
                );
                break;
        }

        const results = await AchievementStatus.parseAsync({
            achievement: achievementSlug,
            complete: complete,
        });

        return results;
    }
}
