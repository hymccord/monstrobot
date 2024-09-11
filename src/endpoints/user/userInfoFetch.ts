import { OpenAPIRoute } from "chanfana";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { Context } from "hono";
import { Profile, ProfileSchema } from "types";

export class UserInfoFetch extends OpenAPIRoute {
    schema = {
        tags: ["User"],
        summary: "Get user info",
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
                description: "User info",
                schema: ProfileSchema,
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

        let message: Profile;
        try {
            message = await client.getUserInfo(
                {
                    hgToken,
                    uniqueHash,
                },
                userSnuid
            );

            return c.json(message);
        } catch {}

        return c.json(
            {
                success: false,
                error: "Bad request",
            },
            400
        );
    }
}
