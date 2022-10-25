const { SlashCommandBuilder } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("settings")
		.setDescription("The configured settings for this bot"),
	async execute(interaction, client) {
		var channelMentions = [];

		for (channelID of client.blacklistedChannels) {
			channelMentions.push(`<#${channelID}>`);
		}

		await interaction.reply(
			`**Archive Channel**: <#${client.pinsChannel}>\n` +
				`**Blacklisted Channels**: ${
					channelMentions.length ? `${channelMentions.join(", ")}` : "None"
				}\n` +
				`${
					!client.sendAll
						? `**Archive Mode**: ${
								client.lastPinArchive
									? "Oldest pin unpinned\n"
									: "Newest pin unpinned\n"
						  }`
						: "**Archive All Pins**: Enabled"
				}` +
				`**Build date:** 2022-10-24\n`
		);
	},
};
