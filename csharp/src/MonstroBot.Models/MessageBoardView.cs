using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MonstroBot.Models;
public record MessageBoardView
{
    public required IReadOnlyList<CorkboardMessage> Messages { get; init;  }
}

public record CorkboardMessage
{
    [JsonPropertyName("body")]
    public required string Message { get; init; }
    public required ulong UserId { get; init; }
    public required string SnUserId { get; init; }
    public required DateTime CreateDate { get; init; }
}
