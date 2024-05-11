
namespace MonstroBot.Models;

public record RoleResponse
{
    public ulong Id { get; init; }
    /// <example>
    /// { "Star": false }
    /// </example>
    public required Dictionary<Role, bool> Roles { get; init; }
}

public record MouseHuntAuth
{
    public required string HgToken { get; set; }
    public required string UniqueHash { get; set; }
}
