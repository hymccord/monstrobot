import {
    DataOf,
    Header,
    Num,
    OpenAPIRoute,
    OpenAPIRouteSchema,
    Path,
    Query,
    Str,
} from "@cloudflare/itty-router-openapi";
import { z } from "zod";
import { RandomPhrase } from "types";
import { generateSlug } from "random-word-slugs";

export class RandomPhraseFetch extends OpenAPIRoute {
    static schema = {
        tags: ["Phrase"],
        summary: "Get a random set of words",
        parameters: {
            adjectives: Query(Num, {required: false, default: 3}),
            nouns: Query(Num, {required: false, default: 1}),
        },
        responses: {
            "200": {
                description: "A random set of words",
                schema: RandomPhrase,
            },
        },
    };

    async handle(
        request: Request,
        env: any,
        context: any,
        data: DataOf<typeof RandomPhraseFetch.schema>
    ) {

        const {adjectives: numAdjectives, nouns: numNouns} = data.query;
        const slug = generateSlug(numAdjectives + numNouns, {
            format: "title",
            // @ts-expect-error
            partsOfSpeech: [
                ...Array<"adjective">(numAdjectives).fill("adjective"),
                ...Array<"noun">(numAdjectives).fill("noun"),
            ]
        })

        const phrase = await RandomPhrase.parseAsync({
            phrase: slug
        });

        return phrase
    }
}
