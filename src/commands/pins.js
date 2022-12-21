const { SlashCommandBuilder } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("pins")
		.setDescription("See the number of pinned messages in this channel"),
	async execute(interaction, client) {
		var channel = client.channels.cache.get(interaction.channelId);
		channel.messages.fetchPinned().then(async (pins) => {
			await interaction.reply(
				`There ${pins.size > 1 ? "are" : "is"} ${pins.size} pin${pins.size > 1 ? "s" : ""} in <#${
					interaction.channelId
				}>`
			);
		});
	},
};

function getPins(channel) {
	return channel.messages.fetchPinned();
}
