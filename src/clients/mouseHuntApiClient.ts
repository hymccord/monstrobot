import { HTTPException } from "hono/http-exception";
import formUrlEncoded from "form-urlencoded";
import jp from "jsonpath";
import { z } from "zod";

import * as hg from "hg.types";
import * as types from "types";
import { env } from "cloudflare:workers";

export class MouseHuntApiClient {
    private _defaultFormData = {
        sn: "Hitgrab",
        hg_is_ajax: "1",
    };
    private _defaultHeaders: HeadersInit = {
        "User-Agent": "monstro-bot/1.0",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    };

    constructor() {}

    public async getMe(
        credentials: MouseHuntCredentials
    ): Promise<{user_id: number}> {
        const data = await this.queryApiEndpoint(credentials,
        "get/user/me",
        z.object({
            user_id: z.number(),
        }));

        return data;
    }

    public async getUser(
        credentials: MouseHuntCredentials,
    ): Promise<z.infer<typeof hgUserSchema>> {
        const data = await this.fetchWithRetriesAsync(
            credentials,
            "/managers/ajax/pages/page.php",
            { page_class: "Camp" },
            false,
        )

        const hgResponse = hgResponseSchema.safeParse(data);
        if (!hgResponse.success) {
            this.throwHttpException("Failed to parse response", 500);
        }

        return hgResponse.data.user;
    }

    public async getUserSnuid(
        credentials: MouseHuntCredentials,
        userId: number
    ): Promise<string> {

        const data = await this.queryApiEndpoint(credentials,
            `get/usersnuid/${userId}`,
            UserSnuidSchema
        );

        return data.sn_user_id;
    }

    public async getUserInfo(
        credentials: MouseHuntCredentials,
        snuid: string,
    ): Promise<types.Profile> {
        // create string from all fields in UserInfo joined with comma
        const fields = Object.keys(types.ProfileSchema.shape).join(",");
        const data = await this.queryApiEndpoint(
            credentials,
            `get/user/${snuid}/${fields}`,
            types.ProfileSchema
        );

        return data;
    }

    public async getMice(credentials: MouseHuntCredentials): Promise<hg.Mice> {
        const data = await this.queryApiEndpoint(
            credentials,
            "get/mouse/all",
            hg.MiceSchema
        );

        return data;
    }

    public async getUserFields<T extends z.AnyZodObject>(
        credentials: MouseHuntCredentials,
        snuid: string,
        schema: T): Promise<z.infer<T>> {
        const fields = Object.keys(schema.shape).join(",");
        const data = await this.queryApiEndpoint(
            credentials,
            `get/user/${snuid}/${fields}`,
            schema
        );

        return data;
    }

    public async getCorkboardMessage(
        credentials: MouseHuntCredentials,
        snuid: string
    ): Promise<types.CorkboardMessage> {
        const data = await this.queryApiEndpoint(
            credentials,
            'get/corkboard/profile',
            types.CorkboardSchema,
            { sn_user_id: snuid }
        );

        return data.corkboard_messages[0];
    }

    public async getUserData<T extends z.ZodType>(
        credentials: MouseHuntCredentials,
        parameters: Record<string, string>,
        jsonPath: string
    ): Promise<T> {
        const response = await this.queryFormEndpoint(
            credentials,
            "/managers/ajax/users/userData.php",
            z.object({user_data: z.any()}),
            parameters
        );
        const page = response.user_data;

        return jp.value(page, jsonPath) as T;
    }

    public async getPageAsync<T>(
        credentials: MouseHuntCredentials,
        parameters: Record<string, string>,
        jsonPath: string,
    ): Promise<T> {
        const response = await this.queryFormEndpoint(
            credentials,
            "/managers/ajax/pages/page.php",
            z.object({page: z.any()}),
            parameters
        );
        const page = response.page;

        return jp.value(page, jsonPath) as T;
    }

    public async postPuzzleAsync(
        credentials: MouseHuntCredentials,
        code: string,
    ) {
        await this.queryFormEndpoint(
            credentials,
            "/managers/ajax/users/puzzle.php",
            z.object({success: z.boolean()}),
            {
                action: "solve",
                code: code,
            }
        )
    }

    public async queryApiEndpoint<T extends z.ZodType>(
        credentials: MouseHuntCredentials,
        relativeUrl: string,
        schema: T,
        parameters: Record<string, string> = {},
    ): Promise<z.infer<T>> {
        const response = await fetch(`https://www.mousehuntgame.com/api/${relativeUrl}`,
            {
                method: "POST",
                headers: {
                    ...this._defaultHeaders,
                    Cookie: `HG_TOKEN=${credentials.hgToken}`,
                },
                body: formUrlEncoded(parameters),
            }
        );

        const json = await response.json();

        const maybeError = ErrorReponseSchema.safeParse(json);
        if (maybeError.success) {
            this.throwHttpException(maybeError.data.error.message, maybeError.data.error.code);
        }

        return schema.parse(json);
    }

    public async queryFormEndpoint<T extends z.ZodType>(
        credentials: MouseHuntCredentials,
        relativeUrl: string,
        schema: T,
        parameters: Record<PropertyKey, unknown> = {},
    ): Promise<z.infer<T>> {
        const response = await this.fetchWithRetriesAsync(
            credentials,
            relativeUrl,
            parameters
        );

        return schema.parse(response);
    }

    private async fetchWithRetriesAsync(
        credentials: MouseHuntCredentials,
        relativeUrl: string,
        formData: Record<PropertyKey, unknown> = {},
        throwOnPuzzle: boolean = true,
    ): Promise<unknown> {
        const content = {
            ...this._defaultFormData,
            ...formData,
            uh: credentials.uniqueHash,
        };

        for (let tries = 0; tries < 2; tries++) {
            const body = formUrlEncoded(content);
            const response = await fetch(
                `https://www.mousehuntgame.com/${relativeUrl}`,
                {
                    method: "POST",
                    headers: {
                        ...this._defaultHeaders,
                        Cookie: `HG_TOKEN=${credentials.hgToken}`,
                    },
                    body,
                }
            );

            if (!response.ok) {
                throw response;
            }

            if (response.headers.get("content-type") === "text/html") {
                throw new HTTPException(500, {
                    message: "Unexpected html response",
                })
            }

            const json = await response.json();
            const hgResponse = hgResponseSchema.safeParse(json);

            if (!hgResponse.success) {
                throw new HTTPException(500, {
                    message: "Unexpected json response",
                });
            }

            if (throwOnPuzzle && hgResponse.data.user.has_puzzle) {
                if (hgResponse.data.user.user_id === Number(env.HUNTER_ID)) {
                    await fetch("https://api.botghost.com/webhook/1200525765226283088/n9qglx9adgm29pn7y8r7er",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json",
                                Authorization: env.BOTGHOST_WEBHOOK_API_KEY
                            },
                            body: JSON.stringify({
                                variables: [
                                    {
                                        "name": "link",
                                        "variable": "{image_link}",
                                        "value": `https://www.mousehuntgame.com/images/puzzleimage.php?t=${new Date().getTime()}&user_id=${env.HUNTER_ID}`,
                                    }
                                ]
                            }),
                        }
                    )
                }

                throw new HTTPException(500, {
                    message: "User has puzzle",
                });
            }

            // check if we need to refresh session
            const popupMessage = hgResponse.data.messageData.popup.messages[0]?.messageData?.body;
            if (popupMessage == "Your session has expired.") {
                await this.refreshSession(credentials);
                continue;
            }

            return json;
        }

        this.throwHttpException("Failed to fetch data", 500);
    }

    private async refreshSession(credentials: MouseHuntCredentials) {
        await fetch("https://www.mousehuntgame.com/camp.php", {
            method: "GET",
            headers: {
                "User-Agent": "monstrobot/1.0",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                Cookie: `HG_TOKEN=${credentials.hgToken}`,
            },
        });
    }

    private isErrorResponse(response: {} | ErrorReponse): response is ErrorReponse {
        return (response as ErrorReponse).error !== undefined;
    }

    private throwHttpException(message: string, code: number): never {
        // @ts-expect-error
        throw new HTTPException(code, {
            message,
        });
    }
}

// Zod Schemas
const hgUserSchema = z.object({
    user_id: z.number(),
    sn_user_id: z.string(),
    has_puzzle: z.boolean(),
});
const hgResponseSchema = z.object({
    user: hgUserSchema,
    messageData: z.object({
        popup: z.object({
            messages: z.array(z.object({
                messageData: z.object({
                    body: z.string(),
                }),
            })),
        }),
    }),
});

const UserSnuidSchema = z.object({
    sn_user_id: z.string(),
});

const ErrorReponseSchema = z.object({
    error: z.object({
        message: z.string(),
        code: z.number(),
    })
})

type ErrorReponse = z.infer<typeof ErrorReponseSchema>;

export interface MouseHuntCredentials {
    hgToken: string;
    uniqueHash: string;
}

type ServerError = { code: "internal_server_error"; message: string };
