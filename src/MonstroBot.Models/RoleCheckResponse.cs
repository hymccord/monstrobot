namespace MonstroBot.Models;

public record RoleCheckResponse
{
    public ulong Id { get; init; }
    public Role Role { get; init; }
    public bool Eligible { get; init; }
}
