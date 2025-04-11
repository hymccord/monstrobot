import { discordMouseHuntUsers, InsertDiscordMouseHuntUser } from "schema";
import { and, eq, or } from "drizzle-orm";
import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Context } from "hono";

export class IdentifyCreate extends OpenAPIRoute {
    schema = {
        tags: ["Identify"],
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: z.object({
                            discordId: z.coerce.string().describe("Discord ID"),
                            guildId: z.coerce.string().describe("Guild ID"),
                            mousehuntId: z.number().describe("MouseHunt Profile ID")
                        }),
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            }
        ],
        responses: {
            201: {
                description: "Created",
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
            409: {
                description: "ID already exists",
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
        const { discordId, guildId, mousehuntId } = data.body;

        const newUser: InsertDiscordMouseHuntUser = {
            id: discordId,
            guildId: guildId,
            mhid: mousehuntId,
        };

        // Check if either mhid or dId already exists in combination with guildId
        const user = await db.query.discordMouseHuntUsers.findFirst({
            where: or(
                and(
                    eq(discordMouseHuntUsers.id, discordId),
                    eq(discordMouseHuntUsers.guildId, guildId),
                ),
                and(
                    eq(discordMouseHuntUsers.mhid, mousehuntId),
                    eq(discordMouseHuntUsers.guildId, guildId),
                )
            ),
        });

        if (user) {
            return c.json({
                success: false,
                error: "ID already exists",
            }, 409);
        }

        try {
            await db.insert(discordMouseHuntUsers).values(newUser);
        } catch {
            return c.json({
                success: false,
                error: "Failed to create user",
            }, 400);
        }

        return c.json({
            discordId,
            guildId,
            mousehuntId,
        }, 201);
    }
}
