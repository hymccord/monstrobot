import { z } from 'zod';

export const MouseSchema = z.object({
    mouse_id: z.coerce.number(),
    weaknesses: z.record(
        z.union([
            z.literal("phscl"),
            z.literal("shdw"),
            z.literal("tctcl"),
            z.literal("arcn"),
            z.literal("frgttn"),
            z.literal("drcnc"),
            z.literal("law"),
            z.literal("rift"),
        ]),
        z.number(),
    ),
});
export type Mouse = z.infer<typeof MouseSchema>;
export const MiceSchema = z.array(MouseSchema);
export type Mice = z.infer<typeof MiceSchema>;

export const ProfileSchema = z.object({
    sn_user_id: z.string(),
    user_id: z.number(),
    title_id: z.number(),
    mice: z.array(z.object({
        mouse_id: z.number(),
        num_catches: z.number(),
    }))
});
export type Profile = z.infer<typeof ProfileSchema>;
