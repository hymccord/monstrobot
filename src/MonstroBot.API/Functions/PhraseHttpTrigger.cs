using System.Net;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;

using MonstroBot.API.Services;

namespace MonstroBot.API.Functions;

public class PhraseHttpTrigger
{
    private readonly ILogger<PhraseHttpTrigger> _logger;
    private readonly IRandomWordPhraseGenerator _phraseGenerator;

    public PhraseHttpTrigger(ILogger<PhraseHttpTrigger> logger, IRandomWordPhraseGenerator phraseGenerator)
    {
        _logger = logger;
        _phraseGenerator = phraseGenerator;
    }

    [Function(nameof(GetPhrase))]
    [OpenApiParameter("numAdjectives", In = ParameterLocation.Query, Required = false, Type = typeof(uint), Summary = "Number of adjectives.")]
    [OpenApiParameter("numNouns", In = ParameterLocation.Query, Required = false, Type = typeof(uint), Summary = "Number of nouns.")]
    [OpenApiResponseWithBody(HttpStatusCode.OK, "application/json", typeof(string))]
    public async Task<IActionResult> GetPhrase([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = "phrase")] HttpRequest req)
    {
        _logger.LogInformation("C# HTTP trigger function processed a request.");

        if (!int.TryParse(req.Query["numAdjectives"], out int numAdjectives))
        {
            numAdjectives = 2;
        }

        if (!int.TryParse(req.Query["numNouns"], out int numNouns))
        {
            numNouns = 2;
        }

        string phrase = _phraseGenerator.GeneratePhrase(numAdjectives, numNouns);

        return await Task.FromResult(new OkObjectResult(phrase)).ConfigureAwait(false);
    }
}
