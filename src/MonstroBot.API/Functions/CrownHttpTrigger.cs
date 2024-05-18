using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Configurations;
using Microsoft.Extensions.Logging;
using MonstroBot.API.Client;

namespace MonstroBot.API.Functions
{
    public class CrownHttpTrigger
    {
        private readonly ILogger<CrownHttpTrigger> _logger;
        private readonly OpenApiSettings _openApi;
        private readonly MouseHuntHtmlClient _htmlClient;

        public CrownHttpTrigger(ILogger<CrownHttpTrigger> logger, OpenApiSettings openApi, MouseHuntHtmlClient mouseHuntHtmlClient)
        {
            _logger = logger;
            _openApi = openApi;
            _htmlClient = mouseHuntHtmlClient;
        }

        [Function(nameof(GetCrownCount))]
        public async Task<IActionResult> GetCrownCount([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "crowncount/{snuid}")] HttpRequest req,
            string snuid)
        {
            var crowns = await _htmlClient.KingsCrownsAsync(snuid);

            return new OkObjectResult(crowns);
        }
    }
}
