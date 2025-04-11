import { contentJson, OpenAPIRoute } from "chanfana";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { Context } from "hono";
import z from "zod";

export class KingsRewardPost extends OpenAPIRoute {
    schema = {
        request: {
            params: z.object({
                code: z.string().length(5).describe("Puzzle data"),
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
                description: "Returns kings reward data",
                content: {
                    "application/json": {
                        schema: z.object({
                            link: z.string().url(),
                        }),
                    }
                }
            },
            "400": {
                description: "Bad request",
            },
            "404": {
                description: "Not found",
            }
        }
    }

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const credentials = data.headers;

        var client = new MouseHuntApiClient();
        await client.postPuzzleAsync(credentials, data.params.code);
    }
}
