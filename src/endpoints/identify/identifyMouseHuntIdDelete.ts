import { discordMouseHuntUsers } from "schema";
import { eq } from "drizzle-orm";
import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Context } from "hono";
import { MonstroDb } from "types";

export class IdentifyMouseHuntIdDelete extends OpenAPIRoute {
    schema = {
        request: {
            params: z.object({
                id: z.number().describe("MouseHunt Profile ID"),
            }),
        },
        responses: {
            204: {
                description: "Identified user",
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
        const db: MonstroDb = c.get("db");
        const { id } = data.params;

        const user = await db.delete(discordMouseHuntUsers).where(
            eq(discordMouseHuntUsers.mhid, id),
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
