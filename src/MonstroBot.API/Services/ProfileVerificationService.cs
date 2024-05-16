using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using CrypticWizard.RandomWordGenerator;

namespace MonstroBot.API.Services;
public class ProfileVerificationService
{
    private readonly ConcurrentDictionary<ulong, string> _pendingVerifications = new();
    private readonly IDbContextFactory<AnithaBotDbContext> _contextFactory;
    private readonly IRandomWordPhraseGenerator _phraseGenerator;

    public ProfileVerificationService(IDbContextFactory<AnithaBotDbContext> contextFactory,
        IRandomWordPhraseGenerator phraseGenerator)
    {
        _contextFactory = contextFactory;
        _phraseGenerator = phraseGenerator;
    }

    internal Task<string> StartAsync(ulong discordId)
    {
        if (_pendingVerifications.ContainsKey(discordId))
        {
            throw new InvalidOperationException("A verification is already pending for this account");
        }

        string phrase = _phraseGenerator.GeneratePhrase();
        _pendingVerifications.TryAdd(discordId, phrase);

        return Task.FromResult(phrase);
    }

    internal Task<string> GetAsync(ulong discordId)
    {
        var phrase = _pendingVerifications.GetValueOrDefault(discordId, string.Empty);

        if (string.IsNullOrEmpty(phrase))
        {
            throw new InvalidOperationException("Verification has not started for this account. Use `StartAsync` first.");
        }

        return Task.FromResult(phrase);
    }

    internal async Task<bool> VerifyAsync(ulong discordId, ulong mhProfileId)
    {
        if (true)
        {
            AnithaBotDbContext db = await _contextFactory.CreateDbContextAsync();
            await db.MouseHuntUsers.AddAsync(new MouseHuntUser
            {
                HashedDiscordUserId = $"{discordId}",
                HashedMouseHuntId = $"{mhProfileId}"
            });
            await db.SaveChangesAsync();
        }

        return true;
    }

    internal Task CancelAsync(ulong discordId)
    {
        _pendingVerifications.TryRemove(discordId, out _);

        return Task.CompletedTask;
    }

    internal Task CompleteAsync(ulong discordId)
    {
        _pendingVerifications.TryRemove(discordId, out _);

        // Log complete

        return Task.CompletedTask;
    }
}

internal class RandomWordPhraseGenerator : IRandomWordPhraseGenerator
{
    private static readonly WordGenerator s_generator = new();

    public string GeneratePhrase(int numAdjectives = 2, int numNouns = 2)
    {
        const string BasePhrase = "MouseHunt Discord Profile Verification: {0}";

        List<string> adjectives = s_generator.GetWords(WordGenerator.PartOfSpeech.adj, numAdjectives);
        List<string> nouns = s_generator.GetWords(WordGenerator.PartOfSpeech.noun, numNouns);
        string words = string.Join(' ', adjectives.Concat(nouns).Select(Capitalize));

        static string Capitalize(string word) => $"{char.ToUpper(word[0])}{word[1..]}";

        return string.Format(BasePhrase, words);
    }
}

public interface IRandomWordPhraseGenerator
{
    string GeneratePhrase(int numAdjectives = 2, int numNouns = 2);
}
