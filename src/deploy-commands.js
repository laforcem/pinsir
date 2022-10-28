require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord.js");

// Discord application ID
const CLIENT_ID = process.env.CLIENT_ID;
// Discord server ID
const GUILD_ID = process.env.GUILD_ID;
// Bot token
const TOKEN = process.env.TOKEN;

const COMMANDS = [];
const COMMANDS_PATH = path.join(__dirname, "commands");
const COMMAND_FILES = fs
	.readdirSync(COMMANDS_PATH)
	.filter((file) => file.endsWith(".js"));

for (const file of COMMAND_FILES) {
	const FILE_PATH = path.join(COMMANDS_PATH, file);
	const COMMAND = require(FILE_PATH);
	COMMANDS.push(COMMAND.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

//Comment the following lines out to delete commands
rest
	.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: COMMANDS })
	.then((data) =>
		console.log(`Successfully registered ${data.length} application commands.`)
	)
	.catch(console.error);

//Uncomment to delete specific commands
// rest.delete(Routes.applicationGuildCommands(clientId, 'commandId'))
// 	.then(() => console.log('Successfully deleted application command'))
// 	.catch(console.error);
