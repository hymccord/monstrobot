using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

using MonstroBot.Models;

namespace MonstroBot.API;

public class MouseHuntApiClient
{
    private static readonly Uri s_mouseHuntBaseAddress = new("https://www.mousehuntgame.com");
    private readonly IList<KeyValuePair<string, string>> _defaultFormData = [
        new ("sn", "Hitgrab"),
        new ("hg_is_ajax", "1")
    ];
    private readonly HttpClient _httpClient;

    public MouseHuntApiClient()
    {
        var handler = new SocketsHttpHandler()
        {
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate | DecompressionMethods.Brotli,
        };

        _httpClient = new HttpClient(handler)
        {
            BaseAddress = s_mouseHuntBaseAddress,
        };

        _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("monstro-bot", "1.0"));
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json, text/javascript, */*; q=0.01");
        _httpClient.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br");
    }

    public async Task<string> GetUserSnuid(MouseHuntAuth credentials, ulong userId)
    {
        JsonDocument doc = await SendRequestAsync(credentials, "/managers/ajax/pages/friends.php", [
            new ("action", "community_search_by_id"),
            new ("user_id", $"{userId}"),
        ]);

        return doc.RootElement
            .GetProperty("friend")
            .GetProperty("sn_user_id")
            .GetString() ?? string.Empty;
    }

    public async Task<bool> IsEggMaster(MouseHuntAuth credentials, string snUserId)
    {
        JsonDocument doc = await SendRequestAsync(credentials, "/managers/ajax/users/userData.php", [
            new ("sn_user_ids[]", snUserId),
            new ("fields[]", "is_egg_master")
            ]);

        return doc.RootElement
            .GetProperty("user_data")
            .GetProperty(snUserId)
            .GetProperty("is_egg_master")
            .GetBoolean();
    }

    public async Task<bool> IsCheckmarked(MouseHuntAuth credentials, string snUserId)
    {
        var doc = await SendRequestAsync(credentials, "/managers/ajax/pages/page.php", [
            new ("page_class", "HunterProfile"),
            new ("page_arguments[legacyMode]", ""),
            new ("page_arguments[tab]", "items"),
            new ("page_arguments[sub_tab]", "false"),
            new ("page_arguments[snuid]", snUserId),
        ]);

        var items = doc.RootElement
            .GetProperty("page")
            .GetProperty("tabs")
            .GetProperty("items")
            .GetProperty("subtabs")[0]
            .GetProperty("items")
            .GetProperty("categories")
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
            new ("page_class", "HunterProfile"),
            new ("page_arguments[legacyMode]", ""),
            new ("page_arguments[tab]", "kings_crowns"),
            new ("page_arguments[sub_tab]", "false"),
            new ("page_arguments[snuid]", snUserId),
        ]);

        var items = doc.RootElement
            .GetProperty("page")
            .GetProperty("tabs")
            .GetProperty("kings_crowns")
            .GetProperty("subtabs")[0]
            .GetProperty("mouse_crowns")
            .GetProperty("badge_groups")
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
            new ("page_class", "HunterProfile"),
            new ("page_arguments[legacyMode]", ""),
            new ("page_arguments[tab]", "mice"),
            new ("page_arguments[sub_tab]", "location"),
            new ("page_arguments[snuid]", snUserId),
        ]);

        var items = doc.RootElement
            .GetProperty("page")
            .GetProperty("tabs")
            .GetProperty("mice")
            .GetProperty("subtabs")[1]
            .GetProperty("mouse_list")
            .GetProperty("categories")
            .Deserialize<ItemCategoryCompletion[]>(JsonSerializerOptionsProvider.Default);

        if (items is null)
        {
            throw new InvalidOperationException("Item categories are null");
        }

        return items.All(i => i.IsComplete ?? false);
    }

    private async Task<T?> GetPageAsync<T>(MouseHuntAuth credentials, IEnumerable<KeyValuePair<string, string>> parameters, JsonSerializerOptions? jsonSerializerOptions = null)
    {
        var response = await SendRequestAsync(credentials, "/managers/ajax/pages/page.php", parameters);
        return response.RootElement.GetProperty("page").Deserialize<T>(jsonSerializerOptions);
    }

    private async Task<JsonDocument> SendRequestAsync(MouseHuntAuth credentials, string relativeUri, IEnumerable<KeyValuePair<string, string>> parameters)
    {
        var content = new FormUrlEncodedContent(
            Enumerable.Empty<KeyValuePair<string, string>>()
                .Concat(_defaultFormData)
                .Concat(parameters)
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

        return await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
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
