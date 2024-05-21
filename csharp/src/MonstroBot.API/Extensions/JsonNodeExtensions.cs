using Json.Path;

namespace System.Text.Json.Nodes;

public static class JsonNodeExtensions
{
    /// <summary>
    /// Select and extract JSON values from within a given JSON value using JSONPath
    /// </summary>
    /// <param name="node"></param>
    /// <param name="jsonPathQuery"></param>
    /// <returns></returns>
    /// <exception cref="JsonException"></exception>
    public static JsonNode Query(this JsonNode node, string jsonPathQuery)
    {
        var jsonPath = JsonPath.Parse(jsonPathQuery);
        var pathResult = jsonPath.Evaluate(node);

        return pathResult.Matches?.SingleOrDefault()?.Value
            ?? throw new JsonException(string.Format("Couldn't get match from given JSONPath expression: {0}", jsonPathQuery));
    }

    /// <summary>
    /// Select and extract JSON values from within a given JSON value using JSONPath
    /// </summary>
    /// <param name="node"></param>
    /// <param name="jsonPathQuery"></param>
    /// <returns></returns>
    public static JsonNode[]? QueryAll(this JsonNode node, string jsonPathQuery)
    {
        var jsonPath = JsonPath.Parse(jsonPathQuery);
        var pathResult = jsonPath.Evaluate(node);

        if (pathResult.Matches?.Count == 0)
        {
            return null;
        }

        return [.. pathResult.Matches!.Select(n => n.Value)];
    }
}
