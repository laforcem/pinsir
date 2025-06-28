# Pinsir, a pin management bot for Discord

Pinsir is a Discord bot for pin management. Given Discord's 50-message cap on the pins in any channel, Pinsir can migrate old/new pins to a specific channel to work around this limitation.  
This bot was originally forked from [somedumbfox/passel-js](https://github.com/somedumbfox/passel-js), but I have since modified it to overhaul embed quality and build it around my own purposes.

Note: The way Pinsir is currently written does not support multiple servers. One instance of the bot must be run for each server that you want to add it to.

## Running locally

### Prerequisites

- You'll need to first create an application at the [Discord developer portal](https://discord.com/developers/applications/). Use the following settings:
  - Under Bot -> Privileged Gateway Intents, ensure `PRESENCE INTENT`, `SERVER MEMBERS INTENT`, and `MESSAGE CONTENT INTENT` are all enabled.
  - If using OAuth2 -> URL Generator, select the scopes `bot` and `applications.commands`, and then just `Administrator` for permissions.
  - (Recommended) Under Bot -> Authorization Flow, disable `Public Bot` and `Requires OAuth2 Code Grant`.

### Run the bot

1. Clone this repo, then run `npm install` to install dependencies.

2. Create a `.env` file with the following information:

    ```txt
    TOKEN = yourDiscord.bot_Token
    CLIENT_ID = botApplicationID
    GUILD_ID = discordServerID
    PINS_CHANNEL = serverPinsChannelID
    ```

    where `TOKEN` is your private alphanumeric bot token, `CLIENT_ID` is the Application ID for your bot, `GUILD_ID` is the ID number of your Discord server, and `PINS_CHANNEL` is the ID of the text channel where you want your pins to be stored.

3. Run the command deployment script with `npm run register`. If you modify the functionality of [src/deploy-commands.js](src/deploy-commands.js), this will need to be run again.

4. Run `npm start` to start the bot. The terminal should display `Ready!`. You can check the bot's responsiveness using the command `/settings` in the Discord server in which the bot is.

## Commands

`/settings`: Returns the current archive channel, any blacklisted channels, the archive mode, and the date of this build of the bot. This is an excellent way to ensure that your settings are correct.

`/pins`: Returns the number of pinned messages in the channel in which the command is run.

## Configuration options

There are a few variables inside [app.js](src/app.js) that can be used to add to the bot's functionality.

`BLACKLISTED_CHANNELS`: If there are channels that you don't want Pinsir to manage, specify the channel ID's in this array as strings. For example, if I don't want channels `991835081243111464` or `991834994110627902` to be managed, I would write this:

```js
const BLACKLISTED_CHANNELS = ["881235081243111699", "881234994110627548"]
```

`LAST_PIN_ARCHIVE`: When this boolean is set to true, the oldest pinned message in a channel is sent to the archive. When false, the newest pin is archived.

`SEND_ALL`: When this boolean is set to true, all fifty pins will be sent to the archive when the limit is reached. When false, only one pin is archived.

## FAQ

> My bot doesn't seem to work, I made a pin but discord tells me I reached my max.

You'll need to unpin your most recent pin and repin it for it to take effect.
