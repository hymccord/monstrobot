import { contentJson, OpenAPIRoute } from "chanfana";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import formUrlEncoded from "form-urlencoded";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import z from "zod";

export default class KingsRewardFetch extends OpenAPIRoute {
    schema = {
        request: {
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
                description: "Returns kings reward data",
                content: {
                    "application/json": {
                        schema: z.object({
                            link: z.string().url(),
                        }),
                    }
                }
            },
            "400": {
                description: "Bad request",
            },
            "404": {
                description: "Not found",
            }
        }
    }

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const credentials = data.headers;

        const client = new MouseHuntApiClient();
        const me = await client.getMe(credentials);

        let hasPuzzle = false;
        try {
            await client.getPageAsync(credentials, {
                page_class: "Camp",
            }, "$");
        }
        catch (error) {
            if (error instanceof HTTPException) {

            }
        }
        const imageUrl = `https://www.mousehuntgame.com/images/puzzleimage.php?t=${new Date().getTime()}&user_id=${
            me.user_id
        }`;
        const response = await fetch("https://www.mousehuntgame.com/managers/ajax/pages/page.php", {
            method: "GET",
            headers: {
                Accept: "application/json, text/javascript, */*; q=0.01",
                "Accept-Language": "en-US,en;q=0.5",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                Cookie: "HG_TOKEN=" + credentials.hgToken,
            },
            body: formUrlEncoded({
                sn: "Hitgrab",
                hg_is_ajax: "1",
                page_class: "Camp",
                uh: credentials.uniqueHash,
            })
        })
    }
}
