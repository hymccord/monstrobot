using System.Net;
using System.Web.Http;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Configurations;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;

using MonstroBot.Models;

using FromBodyAttribute = Microsoft.Azure.Functions.Worker.Http.FromBodyAttribute;

namespace MonstroBot.API;

public class RoleHttpTrigger(ILogger<RoleHttpTrigger> logger, OpenApiSettings openApi, MouseHuntApiClient apiClient)
{
    private readonly ILogger<RoleHttpTrigger> _logger = logger;
    private readonly OpenApiSettings _openApi = openApi;
    private readonly MouseHuntApiClient _apiClient = apiClient;

    //[Function(nameof(RoleHttpTrigger.GetRoles))]
    //[OpenApiOperation("getRoles", tags: ["role"], Summary = "Get all roles by ID", Description = "This checks for eligibility of all achievement roles.", Visibility = OpenApiVisibilityType.Important)]
    //[OpenApiParameter(name: nameof(id), In = ParameterLocation.Path, Required = true, Type = typeof(ulong), Summary = "ID of user to return", Description = "ID of user to return", Visibility = OpenApiVisibilityType.Important)]
    //[OpenApiRequestBody("application/json", bodyType: typeof(MouseHuntAuth), Required = true, Description = "Account details needed to run the requests")]
    //[OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(RoleResponse), Summary = "successful operation", Description = "successful operation")]
    //[OpenApiResponseWithoutBody(statusCode: HttpStatusCode.BadRequest, Summary = "Invalid ID supplied")]
    //[OpenApiResponseWithoutBody(statusCode: HttpStatusCode.Unauthorized, Summary = "")]
    //public async Task<IActionResult> GetRoles([HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "role/{id}")] HttpRequest req,
    //    [FromBody]MouseHuntAuth account,
    //    ulong id)
    //{
    //    _logger.LogInformation("document title: {DocumentTitle}", _openApi.DocTitle);
    //    _logger.LogInformation("C# HTTP trigger function processed a request.");

    //    var obj = new RoleResponse
    //    {
    //        Id = id,
    //        Roles = new Dictionary<Role, bool>
    //        {
    //            { Role.Star, false }
    //        }
    //    };

    //    return await Task.FromResult(new OkObjectResult(obj)).ConfigureAwait(false);
    //}

    [Function(nameof(CheckRole))]
    [OpenApiOperation("checkRole", tags: ["role"], Summary = "Check given role by ID", Description = "This checks for eligibility of an achievement role.", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: nameof(id), In = ParameterLocation.Path, Required = true, Type = typeof(ulong), Summary = "ID of user to return", Description = "ID of user to return", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiParameter(name: nameof(role), In = ParameterLocation.Path, Required = true, Type = typeof(Role), Summary = "Achievement role to check", Description = "Achievement role to check", Visibility = OpenApiVisibilityType.Important)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(RoleCheckResponse), Summary = "successful operation", Description = "successful operation")]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.BadRequest, Summary = "Invalid ID supplied")]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.Unauthorized, Summary = "Supplied credentials are invalid or expired")]
    public async Task<IActionResult> CheckRole([HttpTrigger(AuthorizationLevel.Anonymous, "GET", "POST", Route = "role/{role}/{id}")] HttpRequest req,
        [FromBody] MouseHuntAuth account,
        string role,
        ulong id)
    {
        _logger.LogInformation("document title: {DocumentTitle}", _openApi.DocTitle);
        _logger.LogInformation("Check role {Role} on {Id}.", role, id);

        if (!Enum.TryParse(role, ignoreCase: true, out  Role roleRequest))
        {
            _logger.LogWarning("Invalid role {Role} supplied", role);
            return new BadRequestObjectResult($"Invalid role: {role}");
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
            Func<MouseHuntAuth, string, Task<bool>> eligibleFunc = roleRequest switch
            {
                Role.Star => _apiClient.IsStarred,
                Role.Egg => _apiClient.IsEggMaster,
                Role.Checkmark => _apiClient.IsCheckmarked,
                Role.Crown => _apiClient.IsCrowned,
                _ => throw new NotImplementedException(),
            };

            bool isEligible = await eligibleFunc(account, snuid);

            var obj = new RoleCheckResponse
            {
                Id = id,
                Role = roleRequest,
                Eligible = isEligible,
            };

            return new OkObjectResult(obj);
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
            _logger.LogError(ex, "Caught general exception during check role");
            return new InternalServerErrorResult();
        }
    }
}
