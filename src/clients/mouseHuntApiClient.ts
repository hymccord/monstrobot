import { Url } from "url";
import { z } from "zod";
import jp from "jsonpath";
import formUrlEncoded from "form-urlencoded";

import * as hg from "hg.types";
import * as types from "types";

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

    public async getUserSnuid(
        credentials: MouseHuntCredentials,
        userId: number
    ): Promise<string> {

        const data = await this.fetchPostAsync(credentials,
            `/api/get/usersnuid/${userId}`,
            UserSnuidSchema
        );

        if (this.isErrorResponse(data)) {
            throw new ApiError(data.error.message, data.error.code);
        }

        return data.sn_user_id;
    }

    public async getUserInfo(
        credentials: MouseHuntCredentials,
        snuid: string,
    ): Promise<types.Profile> {
        // create string from all fields in UserInfo joined with comma
        const fields = Object.keys(types.ProfileSchema.shape).join(",");
        const data = await this.fetchPostAsync(
            credentials,
            `/api/get/user/${snuid}/${fields}`,
            types.ProfileSchema
        );

        if (this.isErrorResponse(data)) {
            throw new ApiError(data.error.message, data.error.code);
        }

        return data;
    }

    public async getMice(credentials: MouseHuntCredentials): Promise<hg.Mice> {
        const data = await this.fetchPostAsync(
            credentials,
            "/api/get/mouse/all",
            hg.MiceSchema
        );

        if (this.isErrorResponse(data)) {
            throw new ApiError(data.error.message, data.error.code);
        }

        return data;
    }

    public async getUserFields<T extends z.AnyZodObject>(
        credentials: MouseHuntCredentials,
        snuid: string,
        schema: T): Promise<z.infer<T>> {
        const fields = Object.keys(schema.shape).join(",");
        const data = await this.fetchPostAsync(
            credentials,
            `/api/get/user/${snuid}/${fields}`,
            schema
        );

        if (this.isErrorResponse(data)) {
            throw new ApiError(data.error.message, data.error.code);
        }

        return data;
    }

    public async getCorkboardMessage(
        credentials: MouseHuntCredentials,
        snuid: string
    ): Promise<types.CorkboardMessage> {
        const data = await this.fetchPostAsync(
            credentials,
            '/api/get/corkboard/profile',
            types.CorkboardSchema,
            { sn_user_id: snuid }
        );

        if (this.isErrorResponse(data)) {
            throw new ApiError(data.error.message, data.error.code);
        }

        return data[0];
    }

    public async getUserData<T>(
        credentials: MouseHuntCredentials,
        parameters: Record<string, string>,
        jsonPath: string
    ): Promise<T> {
        const response = await this.postRequestAsync(
            credentials,
            "/managers/ajax/users/userData.php",
            parameters
        );
        const page = response.user_data;

        return jp.value(page, jsonPath) as T;
    }

    public async getPageAsync<T>(
        credentials: MouseHuntCredentials,
        parameters: Record<string, string>,
        jsonPath: string
    ): Promise<T> {
        const response = await this.postRequestAsync(
            credentials,
            "/managers/ajax/pages/page.php",
            parameters
        );
        const page = response.page;

        return jp.value(page, jsonPath) as T;
    }

    private async fetchPostAsync<T extends z.Schema>(credentials: MouseHuntCredentials,
        requestUrl: string,
        schema: T,
        parameters: Record<string, unknown> = {}
    ): Promise<z.infer<T> | ErrorReponse> {
        const response = await fetch(`https://www.mousehuntgame.com${requestUrl}`,
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

        const apiResponseSchema = z.union([schema, ErrorReponseSchema]);

        return apiResponseSchema.parse(json);
    }

    private async postRequestAsync(
        credentials: MouseHuntCredentials,
        relativeUrl: string,
        formData: Record<string, string>
    ): Promise<any> {
        const content = {
            ...this._defaultFormData,
            ...formData,
            uh: credentials.uniqueHash,
        };
        let data;
        try {
            data = await this.fetchWithRetriesAsync(
                credentials,
                relativeUrl,
                content
            );
        } catch (error) {
            console.log(error);
        }

        return data;
    }

    private async fetchWithRetriesAsync(
        credentials: MouseHuntCredentials,
        relativeUrl: string,
        formData: Record<string, string> = {}
    ): Promise<unknown> {
        try {
            for (let tries = 0; tries < 2; tries++) {
                const response = await fetch(
                    `https://www.mousehuntgame.com${relativeUrl}`,
                    {
                        method: "POST",
                        headers: {
                            ...this._defaultHeaders,
                            Cookie: `HG_TOKEN=${credentials.hgToken}`,
                        },
                        body: formUrlEncoded(formData),
                    }
                );

                if (!response.ok) {
                    throw response;
                }

                if (response.headers.get("content-type") === "text/html") {
                    throw new Error();
                }

                const json = await response.json();

                // check if we need to refresh session
                const popupMessage = jp.value(
                    json,
                    "$.messageData.popup.messages[0].messageData.body"
                );
                if (popupMessage == "Your session has expired.") {
                    await this.refreshSession(credentials);
                    continue;
                }

                return json;
            }
        } catch (error) {
            throw error;
        }

        throw new Error();
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
}

class ApiError extends Error {
    constructor(message: string, public code: number) {
        super(message);
    }
}

// Zod Schemas
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
