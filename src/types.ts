import { z } from "zod";

export const RandomPhrase = z.object({
    phrase: z.string(),
});

export const UserInfo = z.object({
    sn_user_id: z.string(),
    user_id: z.number(),
    title_id: z.number(),
});

export const CorkboardMessage = z.object({
    body: z.string(),
    sn_user_id: z.string(),
    create_date: z.string(z.coerce.date()),
});

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
