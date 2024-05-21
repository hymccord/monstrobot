using System.Text.Json;
using System.Text.Json.Serialization;

using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Extensions.OpenApi.Extensions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MonstroBot.API.Client;
using MonstroBot.API.Services;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(worker => worker.UseNewtonsoftJson())
    .ConfigureServices(services =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        services.Configure<JsonSerializerOptions>(options =>
        {
            options.Converters.Add(new JsonStringEnumConverter());
        });

        services.AddTransient<MouseHuntApiClient>();
        services.AddTransient<IRandomWordPhraseGenerator, RandomWordPhraseGenerator>();
    })
    .Build();

host.Run();
