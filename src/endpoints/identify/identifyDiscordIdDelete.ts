import { discordMouseHuntUsers } from "schema";
import { and, eq } from "drizzle-orm";
import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Context } from "hono";

export class IdentifyDiscordIdDelete extends OpenAPIRoute {
    schema = {
        tags: ["Identify"],
        request: {
            params: z.object({
                id: z.bigint().describe("Discord ID"),
            }),
            query: z.object({
                guildId: z.bigint().describe("Guild ID"),
            }),
        },
        security: [
            {
                bearerAuth: [],
            }
        ],
        responses: {
            204: {
                description: "Identified user",
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
        const { guildId } = data.query;

        const user = await db.delete(discordMouseHuntUsers).where(
            and(
                eq(discordMouseHuntUsers.id, id),
                eq(discordMouseHuntUsers.guildId, guildId),
            ),
        ).returning();

        if (user.length == 0) {
            return c.json({
                success: false,
                error: "User not found",
            }, 404);
        }

        c.status(204);

        return c.body(null);
    }
}
