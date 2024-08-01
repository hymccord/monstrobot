import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { CorkboardMessage } from "types";
import { Context } from "hono";
import { UserCrownService, userPowerCrownSchema } from "services/userCrownService";

export class UserCrownList extends OpenAPIRoute {
    schema = {
        tags: ["User"],
        summary: "Get a user's crown summary",
        request: {
            params: z.object({
                userSlug: z.number().describe("User slug"),
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
                description: "Returns a single message if found",
                content: {
                    "application/json": {
                        schema: userPowerCrownSchema,
                    },
                },
            },
            "400": {
                description: "Bad request",
                content: {
                    "application/json": {
                        schema: z.object({
                            success: z.boolean(),
                            error: z.string(),
                        })
                    },
                },
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
        const { userSlug } = data.params;
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
                    return Response.json(
                        {
                            success: false,
                            error: "User not found",
                        },
                        { status: 404 }
                    );
                }
            }
            return Response.json(
                {
                    success: false,
                    error: "Invalid credentials",
                },
                { status: 401 }
            );
        }

        let crownService = new UserCrownService(client, data.headers)
        try {
            const message = await crownService.getUserCrowns(userSnuid);

            return c.json(message);
        } catch {}

        return Response.json({
            success: false,
            error: "Error parsing crown data",
        },
        { status: 400 })
    }
}
