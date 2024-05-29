import { z } from "zod";
import { MouseHuntApiClient, MouseHuntCredentials } from "clients/mouseHuntApiClient";

const zItemCategoryCompletionArray = z.object({
    name: z.string(),
    is_complete: z.coerce.boolean(),
}).array();

const zMouseCrownBadgeGroups = z.object({
    type: z.string(),
    count: z.number(),
}).array();

export class UserAchievementService {
    private _apiClient: MouseHuntApiClient;
    private _credentials: MouseHuntCredentials;

    constructor(apiClient: MouseHuntApiClient, credentials: MouseHuntCredentials) {
        this._apiClient = apiClient;
        this._credentials = credentials;
    }

    public async HasBronzedAllMice(snuid: string): Promise<boolean> {
        const object = await this._apiClient.getPageAsync(this._credentials, {
            "page_class": "HunterProfile",
            "page_arguments[legacyMode]": "",
            "page_arguments[tab]": "kings_crowns",
            "page_arguments[sub_tab]": "false",
            "page_arguments[snuid]": snuid,
        },
        "$.tabs.kings_crowns.subtabs[0].mouse_crowns.badge_groups")

        const mouseCrownBadgeGroups = await zMouseCrownBadgeGroups.parseAsync(object);
        const totalCrownedMice: number = mouseCrownBadgeGroups.reduce((acc, g) => acc + g.count, 0);

        const resp = await fetch("https://www.mousehuntgame.com/api/get/mouse/all");
        const arr = await resp.json() as any[];
        const totalMice = arr.length - 2;

        return totalCrownedMice == totalMice;
    }

    public async HasAllItems(snuid: string): Promise<boolean> {
        const object = await this._apiClient.getPageAsync(this._credentials, {
            "page_class": "HunterProfile",
            "page_arguments[legacyMode]": "",
            "page_arguments[tab]": "items",
            "page_arguments[sub_tab]": "false",
            "page_arguments[snuid]": snuid,
        },
        "$.tabs.items.subtabs[0].items.categories")

        const itemCategories = await zItemCategoryCompletionArray.parseAsync(object);

        return itemCategories.every(i => i.is_complete);
    }

    public async IsEggMaster(snuid: string): Promise<boolean> {
        const object = await this._apiClient.getUserData(this._credentials, {
            "sn_user_ids[]": snuid,
            "fields[]": "is_egg_master",
        },
        `$['${snuid}'].is_egg_master`)

        const result = z.boolean().parse(object);

        return result;
    }

    public async HasCaughtAllLocationMice(snuid: string): Promise<boolean> {
        // star achievement

        const object = await this._apiClient.getPageAsync(this._credentials, {
            "page_class": "HunterProfile",
            "page_arguments[legacyMode]": "",
            "page_arguments[tab]": "mice",
            "page_arguments[sub_tab]": "location",
            "page_arguments[snuid]": snuid,
        },
        "$.tabs.mice.subtabs[1].mouse_list.categories")

        const itemCategories = await zItemCategoryCompletionArray.parseAsync(object);

        return itemCategories.every(i => i.is_complete);
    }
}
