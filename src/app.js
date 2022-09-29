require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const { Client, GatewayIntentBits, Collection, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');


/**---------------------------------------Start Configuration------------------------------------------------------------**/
//Paste you discord bot token here
const token = process.env.TOKEN;
//Paste your pins channel as a string
//discordjs uses "Snowflakes" which are 64 bit signed Integers represented as strings.
//Pasting as an integer will cause integer collisions
const pinsChannel = process.env.PINS_CHANNEL;
//Enter as comma seperated strings IE ['001', '002']
const blacklistedChannels = []
//Archival Behavior
const lastPinArchive = true // set false if first pin gets archived.
const sendAll = false
/**----------------------------------------End Configuration-------------------------------------------------------------**/



const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
//copy current settings to client
client.commands = new Collection();
client.pinsChannel = pinsChannel
client.blacklistedChannels = blacklistedChannels
client.lastPinArchive = lastPinArchive
client.sendAll = sendAll

//client commands setup !!REQUIRES SLASH COMMAND REGISTRATION!!
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command);
}

//client interaction logic
client.on('interactionCreate', async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	try {
		await command.execute(interaction, client);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

//Logic to process on Pin Event
client.on('channelPinsUpdate', async (channel, time) => {
	console.log('pin event detected')
	//check if update happened in blacklisted channel. This uses the guild cache as a dirty means to find the channel.
	for (let channelId in blacklistedChannels) {
		if (channel.id === channelId)
			console.log("encountered pin update in blacklisted channel")
		return
	}

	// Make sure the pins channel is still available.
	let isPinsChannelPresent = false
	let channelList = channel.guild.channels.cache.values()
	for (let item of channelList) {
		if (item.id === pinsChannel)
			isPinsChannelPresent = true
	}
	if (!isPinsChannelPresent) {
		channel.send("Check to see if the pins archive channel during setup has been deleted")
		return
	}


	try {
		//Get all pinned messages in the channel
		channel.messages.fetchPinned().then((messages) => {

			//when sendAll is on, clear pins and archive all
			if (sendAll && messages.size > 49) {
				let pinEmbeds = []
				console.log("unpinning all messages")
				//build embeds
				for (let message of messages) {
					let embeds = buildEmbed(message[1])
					pinEmbeds = pinEmbeds.concat(embeds)
				}

				if(pinEmbeds.length == 0){
					channel.send(
						`Tried to build embeds but failed to build any. Can not archive messages.`)
					return
				}

				//unpin them all
				for(let message of messages){
					channel.messages.unpin(message[1], "Send All Pin Archive")
				}

				//send embeds in bulk
				channel.guild.channels.fetch(pinsChannel).then(archiveChannel => {
					//can only send 10 embeds at a time. splice out pinEmbeds and send deleted contents
					//repeat until array is empty
					do {
						bulkSend(archiveChannel, pinEmbeds.splice(0, 10))
					} while (pinEmbeds.length > 0)
				})
				return
			} else {
				console.log("sendAll not enabled or pin max not reached")
			}

			//sendAll not enabled, archive and post single pin when full
			if (messages.size > 49 && !sendAll) {
				console.log('Removing Last Pinned Message!')
				let unpinnedMessage = (lastPinArchive) ? messages.last() : messages.first()
				channel.messages.unpin(unpinnedMessage)
				channel.send(`Removing ${(lastPinArchive) ? "last" : "first"} saved pin. See archived pin in: <#${pinsChannel}>`)
				let embed = buildEmbed(unpinnedMessage)
				channel.guild.channels.fetch(pinsChannel).then(archiveChannel => {
					bulkSend(archiveChannel, embed)
				})
				// channel.send(`Removing ${(lastPinArchive) ? "last" : "first"} saved pin. See archived pin in: <#${pinsChannel}>`)
				channel.messages.unpin(unpinnedMessage, "Archive Pin")
			} else {
				console.log("Pin Max Not reached")
			}
		}).catch(error => {
			console.log(error)
		})
	} catch (error) {
		console.log(error)
	}
})

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

client.on("error", (error) =>{
	console.log(error)
})

// Login to Discord with your client's token
client.login(token);


//Functions
/**
 * Creates and returns an embed based on the message contents
 * @param {*} messageToEmbed 
 * @returns 
 */
function buildEmbed(messageToEmbed) {

	if(messageToEmbed.embeds.length > 0)
		return messageToEmbed.embeds

	let embed = new EmbedBuilder()
		.setFooter({ text: `sent in ${messageToEmbed.channel.name} at: ${messageToEmbed.createdAt}` })
		.setAuthor({ name: messageToEmbed.author.username, iconURL: messageToEmbed.author.avatarURL() })
		.setColor(Colors[Object.keys(Colors)[Math.floor(Math.random() * Object.keys(Colors).length)]])
		.addFields(
			{ name: "Jump", value: messageToEmbed.url, inline: false }
		)
	
	if(messageToEmbed.content)
		embed.setDescription(`${messageToEmbed.content}`)
	if (messageToEmbed.attachments.size > 0) {
		if (messageToEmbed.attachments.first().contentType.includes("image"))
			embed.setImage(messageToEmbed.attachments.first().attachment)
	}

	return [embed]
}

/**
 * Bulk sends embeds with a given channel
 * @param {*} channel 
 * @param {*} whatToSend 
 */
function bulkSend(channel, whatToSend){
		channel.send({embeds: whatToSend})
}
