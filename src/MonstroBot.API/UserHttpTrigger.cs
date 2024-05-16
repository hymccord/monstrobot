using System.Data;
using System.Net;
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

using FromBodyAttribute = Microsoft.Azure.Functions.Worker.Http.FromBodyAttribute;

using MonstroBot.Models;

namespace MonstroBot.API;
public class UserHttpTrigger(ILogger<RoleHttpTrigger> logger, OpenApiSettings openApi, MouseHuntApiClient apiClient)
{
    private readonly ILogger<RoleHttpTrigger> _logger = logger;
    private readonly OpenApiSettings _openApi = openApi;
    private readonly MouseHuntApiClient _apiClient = apiClient;

    [Function(nameof(GetCorkboardMessages))]
    [OpenApiOperation("getCorkboardMessage", tags: ["role"], Summary = "Get profile corkboard messages", Description = "Gets messages from a user profile corkboard.", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: nameof(id), In = ParameterLocation.Path, Required = true, Type = typeof(ulong), Summary = "MHID of user to return", Description = "MouseHunt profile ID of user to return", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: "limit", In = ParameterLocation.Query, Required = false, Type = typeof(int), Summary = "Message limit", Description = "Maximum amount of messages to return", Visibility = OpenApiVisibilityType.Advanced)]
    [OpenApiRequestBody("application/json", bodyType: typeof(MouseHuntAuth), Required = true, Description = "Account details needed to run the requests")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(CorkboardMessage[]), Summary = "successful operation", Description = "successful operation")]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.BadRequest, Description = "Invalid ID supplied")]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.Unauthorized, Description = "Supplied credentials are invalid or expired")]
    public async Task<IActionResult> GetCorkboardMessages([HttpTrigger(AuthorizationLevel.Anonymous, "POST", Route = "user/{id}/corkboard")] HttpRequest req,
        [FromBody] MouseHuntAuth account,
        ulong id)
    {
        _logger.LogInformation("document title: {DocumentTitle}", _openApi.DocTitle);
        _logger.LogInformation("Get corkboard messages on {Id}.", id);

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
            return new UnauthorizedObjectResult("Supplied credentials are invalid or expired");
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
}
