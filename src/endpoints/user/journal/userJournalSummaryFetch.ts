import { OpenAPIRoute } from "chanfana";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { JournalSummarySchema, ErrorSchema } from "types";
import { Context } from "hono";

export class UserJournalSummaryFetch extends OpenAPIRoute {
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
                description: "Returns journal summary if found",
                content: {
                    "application/json": {
                        schema: JournalSummarySchema,
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
        try {
            const snuid = await client.getUserSnuid(data.headers, userSlug);
            const res = await client.getPageAsync<BodyInit>(data.headers, {
                "page_class": "HunterProfile",
                "page_arguments[snuid]": snuid,
            },
            "$.tabs.profile.subtabs[0].journals.entries_string")

            let hasSummary = false;
            const journalSummary = {
                hunting_since: "",
                loot_data: {}
            };
            const summary = await new HTMLRewriter()
                .on('div[class*="log_summary"] a', {
                    element: (element) => {
                        hasSummary = true;
                        var onclick = element.getAttribute("onclick") ?? "";
                        // huntingSince, catchData, baitData, lootData
                        // showLogSummary("1 day, 13 hours", {"36_343":"7","36_347":"5"}, {"114_bu":"98","114_c":"98"}, {"2991":"18","803":"35","925":"2","211":"2","380":"2","335":"2"}); return false;'
                        const pattern = /"(?:[^"\\]|\\.)*"|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g;
                        const matches = onclick.match(pattern);

                        if (!matches || matches.length < 4) {
                            return;
                        }

                        journalSummary.hunting_since = JSON.parse(matches[0]);
                        const lootData = JSON.parse(matches[3]);
                        journalSummary.loot_data = Object.keys(lootData).length;
                    },
                })
                .transform(new Response(res)).text();

            if (!hasSummary) {
                return c.json({
                    success: false,
                    error: "No journal summary found",
                }, 404);
            }

            return journalSummary;
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
    }
}
