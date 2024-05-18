# MonstroBot

The repo contains the backend for the Discord Application currently named Monstrobot.

It's used by the [MouseHunt](https://www.mousehuntgame) game [Discord](https://discordapp.com/invite/Ya9zEdk) for integration of user data within the game to support various features within the Discord server.

## Getting Started

This project currently uses Azure Functions under the [C# Isolated Worker Model](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide?tabs=windows) process.

You need to follow the instructions [here](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local#local-development-environments) to ensure your environment is setup for debugging.

After building and starting debugging, you can use [Bruno](https://github.com/usebruno/bruno) to hit endpoints. Be sure to set your `HG_TOKEN` and `unique_hash` in each environment. You can retreive these in-game from browser developer tools. `HG_TOKEN` is a cookie and `unique_hash` is a field stored on the `user` object. Print the value by writing `user.unique_hash` in the developer console.
