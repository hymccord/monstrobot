using System.Net;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;

using AngleSharp;

using Microsoft.AspNetCore.WebUtilities;

namespace MonstroBot.API;
public class MouseHuntHtmlClient
{
    private static readonly Uri s_mouseHuntBaseAddress = new("https://www.mousehuntgame.com");
    private readonly HttpClient _httpClient;
    private IBrowsingContext _browsingContext;

    public MouseHuntHtmlClient()
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
        _httpClient.DefaultRequestHeaders.Add("Accept", "text/html, application/json, text/javascript, */*; q=0.01");
        _httpClient.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br");

        _browsingContext = BrowsingContext.New(Configuration.Default);
    }

    public async Task<bool> IsCheckmarked(string snuid)
    {
        var query = new Dictionary<string, string?>()
        {
            {"snuid", snuid},
            {"tab", "items"}
        };
        string htmlContent = await _httpClient.GetStringAsync(QueryHelpers.AddQueryString("profile.php", query));

        var document = await _browsingContext.OpenAsync(req => req.Content(htmlContent));

        Dictionary<string, int> crownCounts = [];

        var numCategories = document.QuerySelectorAll(".mouseListView-category").Length;
        var numCategoriesComplete = document.QuerySelectorAll(".hunterProfileItemsView-category.complete").Length;

        return numCategories > 0 && numCategories == numCategoriesComplete;
    }

    public async Task<bool> IsStarred(string snuid)
    {
        var query = new Dictionary<string, string?>()
        {
            {"snuid", snuid},
            {"tab", "mice"},
            {"sub_tab", "location"}
        };
        string htmlContent = await _httpClient.GetStringAsync(QueryHelpers.AddQueryString("profile.php", query));

        var document = await _browsingContext.OpenAsync(req => req.Content(htmlContent));

        Dictionary<string, int> crownCounts = [];

        var numCategories = document.QuerySelectorAll(".mouseListView-category").Length;
        var numCategoriesComplete = document.QuerySelectorAll(".mouseListView-category.complete").Length;

        return numCategories > 0 && numCategories == numCategoriesComplete;
    }

    public async Task<bool> IsCrowned(string snuid, int numberOfMice)
    {
        var query = new Dictionary<string, string?>()
        {
            {"snuid", snuid},
            {"tab", "kings_crowns"}
        };
        string htmlContent = await _httpClient.GetStringAsync(QueryHelpers.AddQueryString("profile.php", query));

        var document = await _browsingContext.OpenAsync(req => req.Content(htmlContent));

        int bronzed = 0;
        foreach (var header in document.QuerySelectorAll(".mouseCrownsView-group-header-name"))
        {
            string text = header.TextContent;
            if (Regex.Match(text, @"(\w+) Crowns \((\d+)\)") is Match m && m.Success)
            {
                int count = int.Parse(m.Groups[2].Value);
                bronzed += count;
            }
        }

        return bronzed == numberOfMice;
    }

#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously
    public async Task<bool> IsEggMaster(string snuid)
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
    {
        throw new NotSupportedException();
    }

    public async Task<IDictionary<string, int>> KingsCrownsAsync(string snuid)
    {
        var query = new Dictionary<string, string?>()
        {
            {"snuid", snuid},
            {"tab", "kings_crowns"}
        };
        string htmlContent = await _httpClient.GetStringAsync(QueryHelpers.AddQueryString("profile.php", query));

        var document = await _browsingContext.OpenAsync(req => req.Content(htmlContent));

        Dictionary<string, int> crownCounts = [];
        foreach (var header in document.QuerySelectorAll(".mouseCrownsView-group-header-name"))
        {
            string text = header.TextContent;
            if (Regex.Match(text, @"(\w+) Crowns \((\d+)\)") is Match m && m.Success)
            {
                int count = int.Parse(m.Groups[2].Value);
                string crown = m.Groups[1].Value;

                crownCounts[crown] = count;
            }
        }

        return crownCounts;
    }
}
