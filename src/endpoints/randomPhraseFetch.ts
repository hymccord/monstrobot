import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { RandomPhrase } from "types";
import { generateSlug } from "random-word-slugs";

export class RandomPhraseFetch extends OpenAPIRoute {
    schema = {
        tags: ["Phrase"],
        summary: "Get a random set of words",
        request: {
            query: z.object({
                adjectives: z.number().optional().default(3),
                nouns: z.number().optional().default(1),
            }),
        },
        responses: {
            "200": {
                description: "A random set of words",
                schema: RandomPhrase,
            },
        },
    };

    async handle(c: any) {
        const data = await this.getValidatedData<typeof this.schema>();

        const { adjectives: numAdjectives, nouns: numNouns } = data.query;
        const slug = generateSlug(numAdjectives + numNouns, {
            format: "title",
            // @ts-expect-error
            partsOfSpeech: [
                ...Array<"adjective">(numAdjectives).fill("adjective"),
                ...Array<"noun">(numAdjectives).fill("noun"),
            ],
        });

        const phrase = await RandomPhrase.parseAsync({
            phrase: slug,
        });

        return phrase;
    }
}
