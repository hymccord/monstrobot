﻿using System.Net;
using System.Web.Http;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Configurations;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;

using MonstroBot.Models;
using MonstroBot.API.Client;
using MonstroBot.API.Services;

namespace MonstroBot.API.Functions;
public class UserHttpTrigger(ILogger<RoleHttpTrigger> logger, OpenApiSettings openApi, MouseHuntApiClient apiClient)
{
    private readonly ILogger<RoleHttpTrigger> _logger = logger;
    private readonly OpenApiSettings _openApi = openApi;
    private readonly MouseHuntApiClient _apiClient = apiClient;

    [Function(nameof(GetCorkboardMessages))]
    [OpenApiOperation("getCorkboardMessage", tags: ["role"], Summary = "Get profile corkboard messages", Description = "Gets messages from a user profile corkboard.", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: "hgToken", In = ParameterLocation.Header, Required = true, Type = typeof(string), Summary = "MouseHunt session token", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: "uniqueHash", In = ParameterLocation.Header, Required = true, Type = typeof(string), Summary = "MouseHunt profile unique hash", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: nameof(id), In = ParameterLocation.Path, Required = true, Type = typeof(ulong), Summary = "MHID of user to return", Description = "MouseHunt profile ID of user to return", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: "limit", In = ParameterLocation.Query, Required = false, Type = typeof(int), Summary = "Message limit", Description = "Maximum amount of messages to return", Visibility = OpenApiVisibilityType.Advanced)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(CorkboardMessage[]), Summary = "successful operation", Description = "successful operation")]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.BadRequest, Description = "Invalid ID supplied")]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.Unauthorized, Description = "Supplied credentials are invalid or expired")]
    public async Task<IActionResult> GetCorkboardMessages([HttpTrigger(AuthorizationLevel.Anonymous, "GET", "POST", Route = "user/{id}/corkboard")] HttpRequest req,
        ulong id)
    {
        _logger.LogInformation("document title: {DocumentTitle}", _openApi.DocTitle);
        _logger.LogInformation("Get corkboard messages on {Id}.", id);

        MouseHuntAuth? account = MouseHuntAuthService.GetCredentialsFromHeader(req.Headers);
        if (account is null)
        {
            return new BadRequestObjectResult("No header credentials supplied.");
        }

        int limit = 1;
        if (req.Query.TryGetValue("limit", out var limitValue) && int.TryParse(limitValue.ToString(), out int parsedLimitValue))
        {
            limit = parsedLimitValue;
        }

        string snuid = string.Empty;
        try
        {
            snuid = await _apiClient.GetUserSnuid(account, id).ConfigureAwait(false);
        }
        // bad creds
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Error occurred converting MHID {Id} into SNUID", id);
            return new UnauthorizedObjectResult("Invalid or expired credentials.");
        }
        // bad snuid
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error occurred converting MHID {Id} into SNUID", id);
            return new BadRequestObjectResult($"Error converting MHID {id} into SNUID.");
        }

        try
        {
            var messages = await _apiClient.GetCorkboardMessages(account, snuid, limit).ConfigureAwait(false);

            return new OkObjectResult(messages);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation. More than likely malformed json");
            return new InternalServerErrorResult();
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.Unauthorized)
        {
            _logger.LogWarning("Unauthorized request", ex);
            return new UnauthorizedResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Caught general exception while getting corkboard messages");
            return new InternalServerErrorResult();
        }
    }

    [Function(nameof(GetSnuid))]
    //[OpenApiOperation("GetSnuid", tags: ["role"], Summary = "Get profile snuid", Description = "Gets snuid from id.", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: "hgToken", In = ParameterLocation.Header, Required = true, Type = typeof(string), Summary = "MouseHunt session token", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: "uniqueHash", In = ParameterLocation.Header, Required = true, Type = typeof(string), Summary = "MouseHunt profile unique hash", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: nameof(id), In = ParameterLocation.Path, Required = true, Type = typeof(ulong), Summary = "MHID of user to return", Description = "MouseHunt profile ID of user to return", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(string), Summary = "successful operation", Description = "successful operation")]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.BadRequest, Description = "Invalid ID supplied")]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.Unauthorized, Description = "Supplied credentials are invalid or expired")]
    public async Task<IActionResult> GetSnuid([HttpTrigger(AuthorizationLevel.Anonymous, "GET", "POST", Route = "user/{id}/snuid")] HttpRequest req,
        ulong id)
    {
        _logger.LogInformation("document title: {DocumentTitle}", _openApi.DocTitle);
        _logger.LogInformation("Get snuid of {Id}.", id);

        MouseHuntAuth? account = MouseHuntAuthService.GetCredentialsFromHeader(req.Headers);
        if (account is null)
        {
            return new BadRequestObjectResult("No header credentials supplied.");
        }

        string snuid = string.Empty;
        try
        {
            snuid = await _apiClient.GetUserSnuid(account, id).ConfigureAwait(false);
        }
        // bad creds
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Error occurred converting MHID {Id} into SNUID", id);
            return new UnauthorizedObjectResult("Invalid or expired credentials.");
        }
        // bad snuid
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error occurred converting MHID {Id} into SNUID", id);
            return new BadRequestObjectResult($"Error converting MHID {id} into SNUID.");
        }

        return new OkObjectResult(snuid);
    }
}
