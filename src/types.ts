import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import { z } from "zod";

export const ErrorSchema = z.object({
    success: z.literal(false),
    error: z.string(),
});

export const RandomPhrase = z.object({
    phrase: z.string(),
});

export const ProfileSchema = z.object({
    sn_user_id: z.string(),
    user_id: z.number(),
    title_id: z.number(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const CorkboardMessageSchema = z.object({
    body: z.string(),
    sn_user_id: z.coerce.string(),
    create_date: z.string(z.coerce.date()),
    });
export type CorkboardMessage = z.infer<typeof CorkboardMessageSchema>;
export const CorkboardSchema = z.object({
    corkboard_messages: z.array(CorkboardMessageSchema)
});
export type Corkboard = z.infer<typeof CorkboardSchema>;

export const Achievement = z.enum(["star", "crown", "checkmark", "egg"]);

export const AchievementStatus = z.object({
    achievement: Achievement,
    complete: z.boolean(),
});

export const AllAchievementStatus = z.object({
    id: z.number(),
    snuid: z.string(),
    achievements: z.record(Achievement, z.boolean()),
});
