using System.Text.Json.Serialization;

namespace MonstroBot.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Role
{
    Star,
    Egg,
    Checkmark,
    Crown
}
