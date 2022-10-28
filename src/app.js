require("dotenv").config();
const path = require("node:path");
const fs = require("node:fs");
const moment = require("moment");
const {
	Client,
	GatewayIntentBits,
	Collection,
	EmbedBuilder,
	Colors,
	ActionRowBuilder,
	ButtonBuilder,
} = require("discord.js");

const TOKEN = process.env.TOKEN; // Bot token
const PINS_CHANNEL = process.env.PINS_CHANNEL; // Pins channel id
const BLACKLISTED_CHANNELS = []; // Blacklisted channel ID's (as strings)

// Archival behavior
const LAST_PIN_ARCHIVE = true; // Archive the oldest pin in a channel when true
const SEND_ALL = false;

const COMMANDS_PATH = path.join(__dirname, "commands");
const COMMAND_FILES = fs
	.readdirSync(COMMANDS_PATH)
	.filter((file) => file.endsWith(".js"));

const CLIENT = new Client({ intents: [GatewayIntentBits.Guilds] }); // Create new client instance

// copy current settings to client
CLIENT.commands = new Collection();
CLIENT.pinsChannel = PINS_CHANNEL;
CLIENT.blacklistedChannels = BLACKLISTED_CHANNELS;
CLIENT.lastPinArchive = LAST_PIN_ARCHIVE;
CLIENT.sendAll = SEND_ALL;

// Client commands setup (requires slash command registration)
for (const file of COMMAND_FILES) {
	const FILE_PATH = path.join(COMMANDS_PATH, file);
	const COMMAND = require(FILE_PATH);

	// Set a new item in the Collection with the key as the command name and the value as the exported module
	CLIENT.commands.set(COMMAND.data.name, COMMAND);
}

// client interaction logic
CLIENT.on("interactionCreate", async (interaction) => {
	const COMMAND = CLIENT.commands.get(interaction.commandName);

	if (!interaction.isChatInputCommand()) return;

	if (!COMMAND) return;

	try {
		await COMMAND.execute(interaction, CLIENT);
	} catch (error) {
		console.error(error);
		await interaction.reply({
			content: "Error while executing command",
			ephemeral: true,
		});
	}
});

// Logic to process on pin event
CLIENT.on("channelPinsUpdate", async (channel, time) => {
	console.log("Pin event detected\n");
	let isPinsChannelPresent = false;
	let channelList = channel.guild.channels.cache.values();

	// check if update happened in blacklisted channel. This uses the guild cache as a dirty means to find the channel.
	for (let channelId in BLACKLISTED_CHANNELS) {
		if (channel.id === channelId)
			console.log("encountered pin update in blacklisted channel");
		return;
	}

	// Make sure the pins channel is still available
	for (let item of channelList) {
		if (item.id === PINS_CHANNEL) isPinsChannelPresent = true;
	}

	if (!isPinsChannelPresent) {
		channel.send("Pins channel missing, check config.");
		return;
	}

	try {
		// Get all pinned messages in the channel
		channel.messages
			.fetchPinned()

			.then((messages) => {
				// when sendAll is on, clear pins and archive all
				if (SEND_ALL && messages.size > 49) {
					let pinEmbeds = [];
					console.log("Unpinning all messages\n");

					// build embeds
					for (let message of messages) {
						let embeds = buildEmbed(message[1]);
						pinEmbeds = pinEmbeds.concat(embeds);
					}

					if (pinEmbeds.length == 0) {
						channel.send(
							`Tried to build embeds but failed to build any. Cannot archive messages.`
						);
						return;
					}

					// unpin them all
					for (let message of messages) {
						channel.messages.unpin(message[1], "Send All Pin Archive");
					}

					// send embeds in bulk
					channel.guild.channels.fetch(PINS_CHANNEL).then((archiveChannel) => {
						// can only send 10 embeds at a time. splice out pinEmbeds and send deleted contents
						// repeat until array is empty
						do {
							bulkSend(archiveChannel, pinEmbeds.splice(0, 10));
						} while (pinEmbeds.length > 0);
					});
					return;
				} else {
					console.log("sendAll is false or pin max is not reached\n");
				}

				// sendAll not enabled, archive and post single pin when full
				if (messages.size > 49 && !SEND_ALL) {
					let unpinnedMessage = LAST_PIN_ARCHIVE
						? messages.last()
						: messages.first();

					console.log("Removing last pin\n");
					channel.messages.unpin(unpinnedMessage);
					channel.send(
						`Removing ${
							LAST_PIN_ARCHIVE ? "last" : "first"
						} saved pin. See archived pin in <#${PINS_CHANNEL}>`
					);

					let embed = buildEmbed(unpinnedMessage);
					let button = buildButton(unpinnedMessage);

					channel.guild.channels.fetch(PINS_CHANNEL).then((archiveChannel) => {
						archiveChannel.send({
							embeds: embed,
							components: [new ActionRowBuilder().addComponents(button)],
						});
					});

					channel.messages.unpin(unpinnedMessage, "Archive Pin");
				} else {
					console.log("Pin max not reached\n");
				}
			})
			.catch((error) => {
				console.log(error);
			});
	} catch (error) {
		console.log(error);
	}
});

// When the client is ready, run this code (only once)
CLIENT.once("ready", () => {
	console.log("Ready!\n");
});

CLIENT.on("error", (error) => {
	console.log(error);
});

// Login to Discord with your client's token
CLIENT.login(TOKEN);

/**
 * Creates and returns an embed based on the message contents
 * @param {*} messageToEmbed
 * @returns
 */
function buildEmbed(messageToEmbed) {
	let embedCount = 0;
	let hasImage = false;

	// format date and time with moment
	const DATE_CREATED = moment(messageToEmbed.createdAt).format(
		"MMMM Do YYYY, h:mm a"
	);

	let embed = new EmbedBuilder()
		.setFooter({
			text: `sent in ${messageToEmbed.channel.name} on ${DATE_CREATED}`,
		})
		.setAuthor({
			name: messageToEmbed.author.username,
			iconURL: messageToEmbed.author.avatarURL(),
		})
		// set color of embed to random color
		.setColor(
			Colors[
				Object.keys(Colors)[
					Math.floor(Math.random() * Object.keys(Colors).length)
				]
			]
		);

	// if message has text, add it to the embed
	if (messageToEmbed.content) embed.setDescription(`${messageToEmbed.content}`);

	// if message has embeds, add them to the embed
	if (messageToEmbed.attachments.size > 0) {
		hasImage = true;
		embedCount += messageToEmbed.attachments.size;
		embed.setImage(messageToEmbed.attachments.first().url);
	}

	// iterate through message contents and replace newlines with spaces
	for (let content of messageToEmbed.content.replace(/\n/g, " ").split(" ")) {
		if (isImage(content)) {
			embedCount++;

			// only set image if there is not already an image
			if (!hasImage) {
				hasImage = true;
				embed.setImage(content);
			}
		}
	}

	// if message has more than one image, add a field to the embed
	if (embedCount >= 3) {
		embed.addFields({
			name: "\u200b",
			value: `:warning: \`Message contains ${embedCount - 1} more images\``,
		});
	} else if (embedCount == 2) {
		embed.addFields({
			name: "\u200b",
			value: `\`Message contains 1 more image\``,
		});
	}

	return [embed];
}

/**
 * Creates and returns a button based on the message contents
 * @param {*} messageToEmbed
 * @returns
 */
function buildButton(messageToEmbed) {
	let button = new ButtonBuilder()
		.setLabel("Jump")
		.setStyle(5) // link style
		.setURL(messageToEmbed.url);

	return button;
}

/**
 * Bulk sends embeds with a given channel
 * @param {*} channel
 * @param {*} embed
 * @returns
 */
function bulkSend(channel, embed) {
	channel.send({ embeds: embed });
}

/**
 * Checks if a string is an image link
 * @param {*} url
 * @returns
 */
function isImage(url) {
	return /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(url);
}
