import { OpenAPIRoute, Query, Num, Path, Str, DateTime, DateOnly, Header, Hostname, DataOf } from "@cloudflare/itty-router-openapi"
import { z } from "zod";

export class ToDoCreateTyped extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'List all ToDos',
    parameters: {
      p_num: Query(Num),
      p_num2: Path(new Num()),
      p_arrstr: Query([Str]),
      p_datetime: Query(DateTime),
      p_dateonly: Path(DateOnly),
      p_hostname: Header(Hostname),
    },
    requestBody: z.object({
      title: z.string(),
      description: z.string().optional(),
      type: z.enum(['nextWeek', 'nextMoth']),
    }),
    responses: {
      '200': {
        description: 'example',
        schema: {
          params: {},
          results: ['lorem'],
        },
      },
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: DataOf<typeof ToDoCreateTyped.schema>
  ) {
    data.query.p_num
    data.query.p_arrstr
    data.query.p_datetime
    data.params.p_num2
    data.params.p_dateonly
    data.headers.p_hostname
    data.body.title
    data.body.type
    data.body.description
    return {
      params: data,
      results: ['lorem', 'ipsum'],
    }
  }
}
