import {
  DataOf,
  Header,
  Num,
  OpenAPIRoute,
  OpenAPIRouteSchema,
  Path,
  Str,
} from "@cloudflare/itty-router-openapi";
import { z } from "zod";
import { MouseHuntApiClient } from "clients/mouseHuntApiClient";
import { CorkboardMessage } from "types";

export class UserCorkboardFetch extends OpenAPIRoute {
  static schema = {
    tags: ["User"],
    summary: "Get the most recent corkboard message",
    parameters: {
      userSlug: Path(Num, {
        description: "Profile id slug",
      }),
      hgToken: Header(Str, {
        description: "HitGrab session token required for API authorization",
        required: true,
      }),
      uniqueHash: Header(Str, {
        description: "Unique hash required for API authorization",
        required: true,
      }),
    },
    responses: {
      "200": {
        description: "Returns a single task if found",
        schema: CorkboardMessage,
      },
      "400": {
        description: "Invalid ID supplied",
      },
      "401": {
        description: "Credentials are invalid",
      },
      "404": {
        description: "Task not found",
        schema: {
          success: Boolean,
          error: String,
        },
      },
    },
  };

  async handle(
    request: Request,
    env: any,
    context: any,
    data: DataOf<typeof UserCorkboardFetch.schema>
  ) {
    const client = new MouseHuntApiClient();
    const { userSlug } = data.params;
    const { hgToken, uniqueHash } = data.headers;

    const userSnuid = await client.getUserSnuid(
      {
        hgToken,
        uniqueHash,
      },
      userSlug
    );

    let message = await client.getCorkboardMessage(
      {
        hgToken,
        uniqueHash,
      },
      userSnuid
    );

    return { ...message };
  }
}
