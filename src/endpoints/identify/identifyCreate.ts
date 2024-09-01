import { discordMouseHuntUsers, InsertDiscordMouseHuntUser } from "schema";
import { eq, or } from "drizzle-orm";
import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Context } from "hono";
import { MonstroDb } from "types";

export class IdentifyCreate extends OpenAPIRoute {
    schema = {
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
        const db: MonstroDb = c.get("db");
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
            }, { status: 409 });
        }

        try {
            await db.insert(discordMouseHuntUsers).values(newUser);
        } catch {
            return c.json({
                success: false,
                error: "Failed to create user",
            }, { status: 400 });
        }

        return c.json({
            discordId,
            mousehuntId,
        });
    }
}
