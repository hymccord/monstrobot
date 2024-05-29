import { Url } from "url";
import { z } from "zod";
import jp from "jsonpath";
import formurlencoded from "form-urlencoded";

import { AchievementStatus, CorkboardMessage } from "types";

export class MouseHuntApiClient {
  private _defaultFormData = {
    sn: "Hitgrab",
    hg_is_ajax: "1",
  };
  private _defaultHeaders: HeadersInit = {
    "User-Agent": "monstro-bot/1.0 (github.com/hymccord/monstrobot)",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  };

  constructor() {}

  public async getUserSnuid(
    credentials: MouseHuntCredentials,
    userId: number
  ): Promise<string> {
    const doc = await this.postRequestAsync(
      credentials,
      "/managers/ajax/pages/friends.php",
      {
        action: "community_search_by_id",
        user_id: `${userId}`,
      }
    );

    var data = jp.value(doc, "$.friend.sn_user_id") ?? "";

    return data;
  }

  public async getCorkboardMessage(
    credentials: MouseHuntCredentials,
    snuid: string
  ): Promise<z.infer<typeof CorkboardMessage>> {
    const object = await this.getPageAsync(
      credentials,
      {
        page_class: "HunterProfile",
        "page_arguments[snuid]": snuid,
      },
      "$.tabs.profile.subtabs[0].message_board_view.messages[0]"
    );

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
    let data;
    try {
      data = await this.fetchWithRetriesAsync(
        `https://www.mousehuntgame.com${relativeUrl}`,
        credentials,
        formData
      );
    } catch (error) {
      console.log(error);
    }

    return data;
  }

  private async fetchWithRetriesAsync(
    url: string,
    credentials: MouseHuntCredentials,
    formData: Record<string, string>
  ): Promise<unknown> {
    try {
      for (let tries = 0; tries < 2; tries++) {
        const content = formurlencoded({
          ...this._defaultFormData,
          ...formData,
          uh: credentials.uniqueHash,
        });

        const response = await fetch(url, {
          method: "POST",
          headers: {
            ...this._defaultHeaders,
            Cookie: `HG_TOKEN=${credentials.hgToken}`,
          },
          body: content,
        });

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
          await this.RefreshSession(credentials);
          continue;
        }

        return json;
      }
    } catch (error) {
      throw error;
    }

    throw new Error();
  }

  private async RefreshSession(credentials: MouseHuntCredentials) {
    await fetch("https://www.mousehuntgame.com/camp.php", {
      method: "GET",
      headers: {
        "User-Agent": "monstrobot/1.0 (github.com/hymccord/monstrobot)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
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
