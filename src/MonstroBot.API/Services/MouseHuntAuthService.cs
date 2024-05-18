using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;

using MonstroBot.Models;

namespace MonstroBot.API.Services;

internal class MouseHuntAuthService
{
    public static MouseHuntAuth? GetCredentialsFromHeader(IHeaderDictionary headers)
    {
        string? token = headers["hgToken"];
        string? uniqueHash = headers["uniqueHash"];
        if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(uniqueHash))
        {
            return null;
        }

        return new MouseHuntAuth
        {
            HgToken = token,
            UniqueHash = uniqueHash,
        };
    }
}
