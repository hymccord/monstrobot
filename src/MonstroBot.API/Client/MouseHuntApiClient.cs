using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;

using Json.Path;

using Microsoft.Extensions.Logging;
using MonstroBot.Models;

namespace MonstroBot.API.Client;

/// <summary>
/// Main http client for abstracting over the MouseHunt ajax API
/// </summary>
public class MouseHuntApiClient
{
    private static readonly Uri s_mouseHuntBaseAddress = new("https://www.mousehuntgame.com");
    private readonly IList<KeyValuePair<string, string>> _defaultFormData = [
        new ("sn", "Hitgrab"),
        new ("hg_is_ajax", "1")
    ];
    private readonly ILogger<MouseHuntApiClient> _logger;
    private readonly HttpClient _httpClient;

    public MouseHuntApiClient(ILogger<MouseHuntApiClient> logger)
    {
        _logger = logger;

        var handler = new SocketsHttpHandler()
        {
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate | DecompressionMethods.Brotli,
            UseCookies = false,
        };

        _httpClient = new HttpClient(handler)
        {
            BaseAddress = s_mouseHuntBaseAddress,
        };

        _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("monstro-bot", "1.0"));
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json, text/javascript, */*; q=0.01");
        _httpClient.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br");
    }

    /// <summary>
    /// Convert a MouseHunt profile ID into Social Network Unique ID (snuid).
    /// </summary>
    /// <param name="credentials"></param>
    /// <param name="userId">MouseHunt profile id</param>
    /// <returns>MouseHunt snuid</returns>
    public async Task<string> GetUserSnuid(MouseHuntAuth credentials, ulong userId)
    {
        var doc = await SendRequestAsync(credentials, "/managers/ajax/pages/friends.php", [
            ("action", "community_search_by_id"),
            ("user_id", $"{userId}"),
        ]);

        return (string?)doc.Query("$.friend.sn_user_id") ?? string.Empty;
    }

    public async Task<bool> IsEggMaster(MouseHuntAuth credentials, string snUserId)
    {
        var doc = await SendRequestAsync(credentials, "/managers/ajax/users/userData.php", [
            ("sn_user_ids[]", snUserId),
            ("fields[]", "is_egg_master")
            ]);

        return (bool)doc.Query($"$.user_data['{snUserId}'].is_egg_master");
    }

    public async Task<bool> IsCheckmarked(MouseHuntAuth credentials, string snUserId)
    {
        var doc = await SendRequestAsync(credentials, "/managers/ajax/pages/page.php", [
            ("page_class", "HunterProfile"),
            ("page_arguments[legacyMode]", ""),
            ("page_arguments[tab]", "items"),
            ("page_arguments[sub_tab]", "false"),
            ("page_arguments[snuid]", snUserId),
        ]);

        var items = doc.Query("$.page.tabs.items.subtabs[0].items.categories")
            .Deserialize<ItemCategoryCompletion[]>(JsonSerializerOptionsProvider.Default);

        if (items is null)
        {
            throw new InvalidOperationException("Item categories are null");
        }

        return items.All(i => i.IsComplete ?? false);
    }

    public async Task<bool> IsCrowned(MouseHuntAuth credentials, string snUserId)
    {
        var doc = await SendRequestAsync(credentials, "/managers/ajax/pages/page.php", [
            ("page_class", "HunterProfile"),
            ("page_arguments[legacyMode]", ""),
            ("page_arguments[tab]", "kings_crowns"),
            ("page_arguments[sub_tab]", "false"),
            ("page_arguments[snuid]", snUserId),
        ]);

        var items = doc.Query("$.page.tabs.kings_crowns.subtabs[0].mouse_crowns.badge_groups")
            .Deserialize<MouseCrownBadgeGroup[]>(JsonSerializerOptionsProvider.Default);

        if (items is null)
        {
            throw new InvalidOperationException("Badge groups are null");
        }

        return (items.FirstOrDefault(bg => bg.Type == "none")?.Count ?? 0) == 0;
    }

    public async Task<bool> IsStarred(MouseHuntAuth credentials, string snUserId)
    {
        var doc = await SendRequestAsync(credentials, "/managers/ajax/pages/page.php", [
            ("page_class", "HunterProfile"),
            ("page_arguments[legacyMode]", ""),
            ("page_arguments[tab]", "mice"),
            ("page_arguments[sub_tab]", "location"),
            ("page_arguments[snuid]", snUserId),
        ]);

        var items = doc.Query("$.page.tabs.mice.subtabs[1].mouse_list.categories")
            .Deserialize<ItemCategoryCompletion[]>(JsonSerializerOptionsProvider.Default);

        if (items is null)
        {
            throw new InvalidOperationException("Item categories are null");
        }

        return items.All(i => i.IsComplete ?? false);
    }

    public async Task<IReadOnlyList<CorkboardMessage>> GetCorkboardMessages(MouseHuntAuth credentials, string snuid, int limit = 1)
    {
        var doc = await GetPageAsync<MessageBoardView>(credentials, [
            ("page_class", "HunterProfile"),
            ("page_arguments[snuid]", snuid),
        ],
        "$.tabs.profile.subtabs[0].message_board_view",
        JsonSerializerOptionsProvider.RelaxedDateTime);

        return [.. doc.Messages.Take(limit)];
    }

    private async Task<T?> GetPageAsync<T>(MouseHuntAuth credentials, IEnumerable<(string key, string value)> parameters, JsonSerializerOptions? jsonSerializerOptions = null)
    {
        var response = await SendRequestAsync(credentials, "/managers/ajax/pages/page.php", parameters);
        return response["page"].Deserialize<T>(jsonSerializerOptions ?? JsonSerializerOptionsProvider.Default);
    }

    private async Task<T?> GetPageAsync<T>(MouseHuntAuth credentials, IEnumerable<(string key, string value)> parameters,
        string jsonPath,
        JsonSerializerOptions? jsonSerializerOptions = null) where T : class
    {
        var response = await SendRequestAsync(credentials, "/managers/ajax/pages/page.php", parameters);
        var page = response["page"]!;

        return page.Query(jsonPath).Deserialize<T>(jsonSerializerOptions ?? JsonSerializerOptionsProvider.Default);
    }

    private async Task<JsonNode> SendRequestAsync(MouseHuntAuth credentials, string relativeUri, IEnumerable<(string key, string value)> parameters)
    {
        var returnResponse = await RequestAsync();

        // Session sometimes expires when HG_TOKEN isn't used (seems to be > 1hr)
        if (IsSessionExpired(returnResponse))
        {
            _logger.LogInformation("Session expired for {UniqueHash}. Refreshing.", credentials.UniqueHash);
            await RefreshSession();
            returnResponse = await RequestAsync();
        }

        return returnResponse;

        async Task<JsonNode> RequestAsync()
        {
            var content = new FormUrlEncodedContent(
                Enumerable.Empty<KeyValuePair<string, string>>()
                    .Concat(_defaultFormData)
                    .Concat(parameters.Select(t => new KeyValuePair<string, string>(t.key, t.value)))
                    .Concat([new KeyValuePair<string, string>("uh", credentials.UniqueHash)])
                );

            var request = new HttpRequestMessage
            {
                RequestUri = new Uri(relativeUri, UriKind.Relative),
                Method = HttpMethod.Post,
                Content = content
            };

            request.Headers.Add("Cookie", $"HG_TOKEN={credentials.HgToken}");
            request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded")
            {
                CharSet = "UTF-8"
            };

            HttpResponseMessage response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            if (response.Content.Headers.ContentType?.MediaType == "text/html")
            {
                throw new ArgumentException("Supplied credentials didn't work", nameof(credentials));
            }

            var node = await JsonNode.ParseAsync(await response.Content.ReadAsStreamAsync().ConfigureAwait(false)).ConfigureAwait(false);
            if (node is null)
            {
                throw new InvalidDataException("Deserialized JSON is null");
            }

            return node;
        }

        async Task RefreshSession()
        {
            HttpRequestMessage req = new(HttpMethod.Get, new Uri("/camp.php", UriKind.Relative));
            req.Headers.Add("Cookie", $"HG_TOKEN={credentials.HgToken}");

            HttpResponseMessage response = await _httpClient.SendAsync(req);
            response.EnsureSuccessStatusCode();

            return;
        }

        bool IsSessionExpired(JsonNode node)
        {
            var path = JsonPath.Parse("$.messageData.popup.messages[0].messageData.body");
            var matches = path.Evaluate(node).Matches;

            return matches?.Count > 0 && (string?)matches[0].Value == "Your session has expired.";
        }
    }

    record ItemCategoryCompletion
    {
        public required string Name { get; init; }
        public bool? IsComplete { get; init; }
    }

    record MouseCrownBadgeGroup
    {
        public required string Type { get; init; }
        public int Count { get; init; }
    }
}
