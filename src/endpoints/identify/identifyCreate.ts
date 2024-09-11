import { discordMouseHuntUsers, InsertDiscordMouseHuntUser } from "schema";
import { eq, or } from "drizzle-orm";
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
        const { discordId, mousehuntId } = data.body;

        const newUser: InsertDiscordMouseHuntUser = {
            id: discordId,
            mhid: mousehuntId,
        };

        const user = await db.query.discordMouseHuntUsers.findFirst({
            where: or(
                eq(discordMouseHuntUsers.id, discordId),
                eq(discordMouseHuntUsers.mhid, mousehuntId),
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
            mousehuntId,
        }, 201);
    }
}
