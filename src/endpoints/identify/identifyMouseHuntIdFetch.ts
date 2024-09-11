import { discordMouseHuntUsers } from "schema";
import { eq } from "drizzle-orm";
import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Context } from "hono";

export class IdentifyMouseHuntIdFetch extends OpenAPIRoute {
    schema = {
        request: {
            params: z.object({
                id: z.number().describe("MouseHunt Profile ID"),
            }),
        },
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
            where: eq(discordMouseHuntUsers.mhid, id),
        })

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
