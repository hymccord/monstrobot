using CrypticWizard.RandomWordGenerator;

namespace MonstroBot.API.Services;

internal class RandomWordPhraseGenerator : IRandomWordPhraseGenerator
{
    private static readonly WordGenerator s_generator = new();

    public string GeneratePhrase(int numAdjectives = 2, int numNouns = 2)
    {
        List<string> adjectives = s_generator.GetWords(WordGenerator.PartOfSpeech.adj, numAdjectives);
        List<string> nouns = s_generator.GetWords(WordGenerator.PartOfSpeech.noun, numNouns);
        string words = string.Join(' ', adjectives.Concat(nouns).Select(Capitalize));

        static string Capitalize(string word) => $"{char.ToUpper(word[0])}{word[1..]}";

        return words;
    }
}

public interface IRandomWordPhraseGenerator
{
    string GeneratePhrase(int numAdjectives = 2, int numNouns = 2);
}
