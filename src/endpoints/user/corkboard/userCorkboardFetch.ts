import { OpenAPIRoute } from "chanfana";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { CorkboardMessage, CorkboardMessageSchema, ErrorSchema } from "types";
import { Context } from "hono";

export class UserCorkboardFetch extends OpenAPIRoute {
    schema = {
        tags: ["User"],
        summary: "Get the most recent corkboard message",
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
                        schema: CorkboardMessageSchema,
                    },
                },
            },
            "400": {
                description: "Bad request",
                content: {
                    "application/json": {
                        schema: ErrorSchema,
                    },
                },
            },
            "401": {
                description: "Credentials are invalid",
                content: {
                    "application/json": {
                        schema: ErrorSchema,
                    },
                },
            },
            "404": {
                description: "Not found",
                content: {
                    "application/json": {
                        schema: ErrorSchema,
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

        let message: CorkboardMessage;
        try {
            message = await client.getCorkboardMessage(
                {
                    hgToken,
                    uniqueHash,
                },
                userSnuid
            );

            if (message.sn_user_id !== userSnuid) {
                message.body = "Montrobot Error: Message author does not match user.";
            }

            return c.json(message);
        } catch {}

        message = {
            sn_user_id: userSnuid,
            create_date: "",
            body: "",
        };

        return c.json(message);
    }
}
