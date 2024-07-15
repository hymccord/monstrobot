import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AchievementStatus, AllAchievementStatus } from "types";
import { generateSlug } from "random-word-slugs";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { UserAchievementService } from "services/userAchievementService";

export class UserAchievementList extends OpenAPIRoute {
    schema = {
        tags: ["User", "Achievements"],
        request: {
            params: z.object({
                userSlug: z.number().describe("Profile id slug"),
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
                schema: AchievementStatus,
            },
            "400": {
                description: "Bad request",
            },
        },
    };

    async handle(c: any) {
        const data = await this.getValidatedData<typeof this.schema>();
        const apiClient = new MouseHuntApiClient();

        const { userSlug } = data.params;
        const achievementService = new UserAchievementService(
            apiClient,
            data.headers
        );

        const snuid = await apiClient.getUserSnuid(data.headers, userSlug);

        const achievementRecord = {
            star: await achievementService.HasCaughtAllLocationMice(snuid),
            crown: await achievementService.HasBronzedAllMice(snuid),
            checkmark: await achievementService.HasAllItems(snuid),
            egg: await achievementService.IsEggMaster(snuid),
        };

        const results = await AllAchievementStatus.parseAsync({
            id: userSlug,
            snuid: snuid,
            achievements: achievementRecord,
        });

        return results;
    }
}
