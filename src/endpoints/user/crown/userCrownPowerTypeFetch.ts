import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { Context } from "hono";
import { UserCrownService, crownTypeSchema, powerCrownTypesSchema } from "services/userCrownService";

export class UserCrownPowerTypeFetch extends OpenAPIRoute {
    schema = {
        tags: ["User"],
        summary: "Get a user's power crown of crown type summary",
        request: {
            params: z.object({
                userSlug: z.number().describe("User slug"),
                powerTypeSlug: powerCrownTypesSchema.describe("Power Crown type"),
                crownTypeSlug: crownTypeSchema.describe("Crown type"),
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
                description: "A list of crown counts",
                content: {
                    "application/json": {
                        schema: z.object({
                            count: z.number(),
                            percent: z.number(),
                        })
                    }
                }
            },
            "400": {
                description: "Bad request",
            },
            "401": {
                description: "Credentials are invalid",
            },
            "404": {
                description: "Not found",
                content: {
                    "application/json": {
                        schema: z.object({
                            success: z.boolean(),
                            error: z.string(),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();

        const client = new MouseHuntApiClient();
        const { userSlug, powerTypeSlug, crownTypeSlug } = data.params;
        const { hgToken, uniqueHash } = data.headers;

        let userSnuid: string;
        try {
            userSnuid = await client.getUserSnuid(
                {
                    hgToken,
                    uniqueHash,
                },
                userSlug
            );
        } catch (e) {
            if (e instanceof Response) {
                if (e.status == 400) {
                    return c.json(
                        {
                            success: false,
                            error: "User not found",
                        },
                        404
                    );
                }
            }
            return c.json(
                {
                    success: false,
                    error: "Invalid credentials",
                },
                401
            );
        }

        let crownService = new UserCrownService(client, data.headers)
        try {
            const message = await crownService.getUserCrowns(userSnuid);

            for (const crown of message.power_crowns) {
                if (crown.type !== powerTypeSlug) {
                    continue;
                }

                return c.json(crown.summary[crownTypeSlug]);
            }
        } catch {}

        return c.json({
            success: false,
            error: "Error parsing crown data",
        }, 400);
    }
}
