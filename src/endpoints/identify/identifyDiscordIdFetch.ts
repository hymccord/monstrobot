import { discordMouseHuntUsers } from "schema";
import { eq } from "drizzle-orm";
import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Context } from "hono";

export class IdentifyDiscordIdFetch extends OpenAPIRoute {
    schema = {
        tags: ["Identify"],
        request: {
            params: z.object({
                id: z.string().describe("Discord ID"), // TODO: Change to bigint when drizzle supports bigint
            }),
        },
        security: [
            {
                bearerAuth: [],
            }
        ],
        responses: {
            200: {
                description: "Identified user",
                content: {
                    'application/json': {
                        schema: z.object({
                            discordId: z.number().describe("Discord ID"),
                            mousehuntId: z.number().describe("MouseHunt Profile ID")
                        }),
                    },
                },
            },
            401: {
                description: "Unauthorized",
                content: {
                    'text/plain': {
                        schema: z.literal("Unauthorized"),
                    },
                }
            },
            404: {
                description: "User not found",
                content: {
                    'application/json': {
                        schema: z.object({
                            success: z.literal(false),
                            error: z.string().describe("Error message"),
                        }),
                    },
                },
            },
        }
    }

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const db = c.get("db");
        const { id } = data.params;

        const user = await db.query.discordMouseHuntUsers.findFirst({
            where: eq(discordMouseHuntUsers.id, id),
        });

        if (!user) {
            return c.json({
                success: false,
                error: "User not found",
            }, 404);
        }

        return c.json({
            discordId: user.id,
            mousehuntId: user.mhid,
        });
    }
}
