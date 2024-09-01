import { z } from "zod";
import {
    MouseHuntApiClient,
    MouseHuntCredentials,
} from "clients/mouseHuntApiClient";
import { ProfileSchema } from "hg.types";

export class UserCrownService {
    private _apiClient: MouseHuntApiClient;
    private _credentials: MouseHuntCredentials;

    constructor(
        apiClient: MouseHuntApiClient,
        credentials: MouseHuntCredentials
    ) {
        this._apiClient = apiClient;
        this._credentials = credentials;
    }

    public async getUserCrowns(
        snuid: string
    ) {
        const classes = await this.getMiceClassifications();
        const classificationCounts: Record<PowerType, number> = {
            arcane: 0,
            draconic: 0,
            forgotten: 0,
            hydro: 0,
            physical: 0,
            shadow: 0,
            tactical: 0,
            law: 0,
            rift: 0,
            event: 0,
            multi: 0
        };

        for (const mouseId of Object.keys(classes).map(Number)) {
            const classification = classes[mouseId];
            classificationCounts[classification]++;
        }

        const data = await this._apiClient.getUserFields(this._credentials,
            snuid,
            ProfileSchema.pick({
                mice: true
            })
        );

        if (data instanceof Error) {
            throw data;
        }

        const record: Record<PowerType, Record<CrownType, { count: number, percent: number }>> =
            powerCrownTypes.reduce((acc, powerType) => {
                acc[powerType] = crownTypes.reduce((acc, crownType) => {
                    acc[crownType] = {
                        count: 0,
                        percent: 0.0
                    };
                    return acc;
                }, {} as Record<CrownType, { count: number, percent: number }>);
                return acc;
            }, {} as Record<PowerType, Record<CrownType, { count: number, percent: number }>>);

        for (const mouse of data.mice) {
            if (mouse.mouse_id === 113 || mouse.mouse_id === 128) {
                continue;
            }

            const classification = classes[mouse.mouse_id];

            const crowns = record[classification];

            if (mouse.num_catches >= 10) {
                crowns.bronze.count++;
                crowns.bronze.percent = (crowns.bronze.count / classificationCounts[classification]) * 100;
            }

            if (mouse.num_catches >= 100) {
                crowns.silver.count++;
                crowns.silver.percent = (crowns.silver.count / classificationCounts[classification]) * 100;
            }

            if (mouse.num_catches >= 500) {
                crowns.gold.count++;
                crowns.gold.percent = (crowns.gold.count / classificationCounts[classification]) * 100;
            }

            if (mouse.num_catches >= 1000) {
                crowns.platinum.count++;
                crowns.platinum.percent = (crowns.platinum.count / classificationCounts[classification]) * 100;
            }

            if (mouse.num_catches >= 2500) {
                crowns.diamond.count++;
                crowns.diamond.percent = (crowns.diamond.count / classificationCounts[classification]) * 100;
            }
        }

        let crownTotals: {[key: string]: {}} = {};
        for (const crownType of crownTypes) {
            let total = 0;
            for (const powerCrownType of powerCrownTypes) {
                total += record[powerCrownType][crownType].count;
            }
            crownTotals[crownType] = {
                count: total,
                percent: total / (data.mice.length - 2) * 100,
            };
        }

        // convert record to array
        let powerCrowns = [];
        for (const powerCrownType of powerCrownTypes) {
            powerCrowns.push({
                type: powerCrownType,
                summary: record[powerCrownType]
            });
        }

        const returnData = {
            summary: crownTotals,
            power_crowns: powerCrowns,
        }

        return returnData;
    }

    private async getMiceClassifications(): Promise<{[index: number]: PowerType}> {
        const response = await fetch("https://api.mouse.rip/mice");
        if (!response.ok) {
            throw new Error("Failed to fetch mice data");
        }
        const data = await response.json()
        const parsedData = miceSchema.parse(data)

        let mice: Record<number, PowerType> = {};
        for (const mouse of parsedData) {
            if (mouse.id === 113 || mouse.id === 128) {
                continue;
            }

            if (mouse.group === "Event Mice") {
                mice[mouse.id] = "event";
                continue;
            }

            if (mouse.effectivenesses == null) {
                continue;
            }

            const effectivenesses = mouse.effectivenesses as Record<string, number>;
            const highestValue = Math.max(...Object.values(effectivenesses));
            const keysWithHighestValue = Object.keys(effectivenesses).filter(key => effectivenesses[key] === highestValue);

            if (keysWithHighestValue.length > 1) {
                mice[mouse.id] = "multi";
            } else {
                mice[mouse.id] = keysWithHighestValue[0] as PowerType;
            }
        }

        return mice;
    }
}

const crownTypes = ["bronze", "silver", "gold", "platinum", "diamond"] as const;
export const crownTypeSchema = z.enum(crownTypes);

type CrownType = z.infer<typeof crownTypeSchema>;

const powerCrownTypes = [
    "arcane",
    "draconic",
    "event",
    "forgotten",
    "hydro",
    "law",
    "multi",
    "physical",
    "rift",
    "shadow",
    "tactical",
] as const;
export const powerCrownTypesSchema = z.enum(powerCrownTypes);

type PowerType = z.infer<typeof powerCrownTypesSchema>;

const miceSchema = z.array(
    z.object({
        id: z.number(),
        type: z.string(),
        name: z.string(),
        abbreviated_name: z.string(),
        description: z.string(),
        points: z.number(),
        gold: z.number(),
        group: z.string(),
        subgroup: z.string(),
        effectivenesses: z.object({
            arcane: z.number(),
            draconic: z.number(),
            forgotten: z.number(),
            hydro: z.number(),
            physical: z.number(),
            shadow: z.number(),
            tactical: z.number(),
            law: z.number(),
            rift: z.number(),
        }).optional(),
    })
);

export const userPowerCrownSchema = z.object({
    summary: z.record(crownTypeSchema, z.object({
        count: z.number(),
        percent: z.number(),
    })),
    power_crowns: z.array(
        z.object({
            type: powerCrownTypesSchema,
            summary: z.record(crownTypeSchema, z.object({
                count: z.number(),
                percent: z.number(),
            })),
        })
    )
})
