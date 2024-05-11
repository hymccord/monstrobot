
using System.Runtime.Serialization;

using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace MonstroBot.Models;

[JsonConverter(typeof(StringEnumConverter))]
public enum Role
{
    [EnumMember(Value = "Star")]
    Star,
    [EnumMember(Value = "Egg")]
    Egg,
    [EnumMember(Value = "Checkmark")]
    Checkmark,
    [EnumMember(Value = "Crown")]
    Crown
}
