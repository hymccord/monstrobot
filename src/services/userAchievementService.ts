import { z } from "zod";
import { MouseHuntApiClient, MouseHuntCredentials } from "clients/mouseHuntApiClient";
import { ProfileSchema } from "hg.types";

const zItemCategoryCompletionArray = z.object({
    name: z.string(),
    is_complete: z.coerce.boolean(),
}).array();

const zMouseCrownBadgeGroups = z.object({
    type: z.string(),
    count: z.number(),
    mice: z.array(z.object({
        name: z.string(),
    }))
}).array();

export class UserAchievementService {
    private _apiClient: MouseHuntApiClient;
    private _credentials: MouseHuntCredentials;

    constructor(apiClient: MouseHuntApiClient, credentials: MouseHuntCredentials) {
        this._apiClient = apiClient;
        this._credentials = credentials;
    }

    public async HasBronzedAllMice(snuid: string): Promise<boolean> {
        const profileMiceSchema = ProfileSchema.pick({
            mice: true
        });
        const data = await this._apiClient.getUserFields(this._credentials,
            snuid,
            profileMiceSchema
        );

        if (data instanceof Error) {
            throw data;
        }

        let allMiceBronze = true;
        for (const mouse of data.mice) {
            // ids for Leprechaun and Mobster
            if (mouse.mouse_id === 113 || mouse.mouse_id === 128) {
                continue;
            }

            allMiceBronze &&= mouse.num_catches >= 10;
        }

        return allMiceBronze;
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
