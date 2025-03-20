import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { JournalSummarySchema, ErrorSchema } from "types";
import { Context } from "hono";
import jp from "jsonpath";

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

        let userSnuid: string;
        try {
            userSnuid = await client.getUserSnuid(data.headers,
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

        try {
            const profileTabSchema = z.object({
                name: z.string().trim(),
                journals: z.object({
                    entries_string: z.string(),
                }),
            })
            const res = await client.getPageAsync<BodyInit>(data.headers, {
                "page_class": "HunterProfile",
                "page_arguments[snuid]": userSnuid,
            },
            "$.tabs.profile.subtabs[0]")

            const profile = profileTabSchema.parse(res);

            let hasSummary = false;
            const journalSummary = {
                name: profile.name,
                since: "",
                hunts: 0,
                loot: 0,
            };

            if (profile.journals.entries_string == '') {
                return c.json({
                    success: false,
                    error: "No journal summary found",
                }, 404);
            }

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

                        journalSummary.since = JSON.parse(matches[0]);
                        const baitData = JSON.parse(matches[2]);
                        const lootData = JSON.parse(matches[3]);
                        // sum values where keys end in _bu
                        journalSummary.hunts = Object.keys(baitData).reduce((acc, key) => {
                            if (key.endsWith("_bu")) {
                                acc += parseInt(baitData[key]);
                            }
                            return acc;
                        }, 0);
                        journalSummary.loot = Object.keys(lootData).length;
                    },
                })
                .transform(new Response(profile.journals.entries_string)).text();

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
