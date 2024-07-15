import { Url } from "url";
import { z } from "zod";
import jp from "jsonpath";
import formUrlEncoded from "form-urlencoded";

import { AchievementStatus, CorkboardMessage } from "types";

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
        const doc = await this.fetchWithRetriesAsync(
            credentials,
            `/api/get/usersnuid/${userId}`
        );

        var data = jp.value(doc, "$.sn_user_id");

        if (data == null) {
            throw new Error();
        }

        return data;
    }

    public async getCorkboardMessage(
        credentials: MouseHuntCredentials,
        snuid: string
    ): Promise<z.infer<typeof CorkboardMessage>> {
        let object = await this.fetchWithRetriesAsync(
            credentials,
            "/api/get/corkboard/profile",
            {
                sn_user_id: snuid,
            }
        );

        object = jp.value(object, "$.corkboard_messages[0]");

        return await CorkboardMessage.parseAsync(object);
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
}

export interface MouseHuntCredentials {
    hgToken: string;
    uniqueHash: string;
}

// interface MessageBoardView {
//     messages: CorkboardMessage[];
// }

// interface CorkboardMessage {
//     body: string
//     user_id: number,
//     sn_user_id: number;
//     create_date: Date;
// }

type ServerError = { code: "internal_server_error"; message: string };
