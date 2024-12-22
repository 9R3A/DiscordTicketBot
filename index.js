require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, WebhookClient, Colors, AttachmentBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

const prefix = process.env.PREFIX; // Get prefix from .env
const token = process.env.BOT_TOKEN;
const LOGS_WEBHOOK_URL = process.env.LOGS_WEBHOOK_URL; // Add this to your .env file
const webhook = new WebhookClient({ url: LOGS_WEBHOOK_URL });

const staffRoleId = process.env.STAFF_ROLE_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const TRANSCRIPTS_CHANNEL_ID = process.env.TRANSCRIPTS_CHANNEL_ID;


client.on('ready', () => {
    console.log(`

    ╔═════════════════════════════════════════════════════════════════════════════════╗
    ║                                                                                 ║
    ║                                                                                 ║
    ║                       █████╗ ██████╗ ██████╗  █████╗                            ║
    ║                      ██╔══██╗██╔══██╗╚════██╗██╔══██╗		              ║
    ║                      ╚██████║██████╔╝ █████╔╝███████║		              ║
    ║                       ╚═══██║██╔══██╗ ╚═══██╗██╔══██║                           ║
    ║                       █████╔╝██║  ██║██████╔╝██║  ██║                           ║
    ║                       ╚════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝                           ║
    ║                                < 3                                              ║
    ║                                                                                 ║
    ╚═════════════════════════════════════════════════════════════════════════════════╝ 
                          ════════════════════════════════════════
                              All Systems Operations Active         
                            → Bot: ${client.user.tag}   
                            → Status: Online 
                            → Pray For Syria & Palastine ❤	
                            → Github: https://github.com/9R3A
                          ════════════════════════════════════════
                                              <3                                     
    `);

    const commands = [
        {
            name: 'ticket',
            description: 'Create a support ticket'
        },
        {
            name: 'close',
            description: 'Close the current ticket'
        },
        {
            name: 'ticketpanel',
            description: 'Create a ticket panel (Admin only)'
        }
    ];
    
    client.application.commands.set(commands);
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ticket') {
        await handleTicketCreation(interaction);
    } else if (interaction.commandName === 'close') {
        await handleTicketClose(interaction);
    } else if (interaction.commandName === 'ticketpanel') {
        await createTicketPanel(interaction);
    }
});

// Handle prefix commands
client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ticket') {
        await handleTicketCreation(message);
    } else if (command === 'close') {
        await handleTicketClose(message);
    }
});

async function handleTicketCreation(interaction) {
    try {
        const member = interaction.member;
        const user = member.user;

        // Check if user already has a ticket
        const existingTicket = interaction.guild.channels.cache.find(
            channel => channel.name === `ticket-${member.user.username.toLowerCase()}`
        );

        if (existingTicket) {
            return interaction.editReply({ 
                content: `You already have a ticket open at ${existingTicket}!`,
                ephemeral: true
            });
        }

        // Create ticket channel
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${member.user.username}`,
            type: 0,
            parent: process.env.TICKET_CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: member.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ],
                },
                {
                    id: process.env.STAFF_ROLE_ID,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageMessages
                    ],
                },
            ],
        });

        const ticketEmbed = new EmbedBuilder()
            .setTitle('Support Ticket')
            .setDescription(`Welcome ${user}!\nSupport will be with you shortly.\nPlease describe your issue in detail.`)
            .addFields(
                { name: 'Ticket Owner', value: `${user}`, inline: true },
                { name: 'Created At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setColor(Colors.Blue)
            .setFooter({ text: `Ticket ID: ${ticketChannel.id}` });

        const ticketButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('claimTicket')
                    .setLabel('Claim Ticket')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👋'),
                new ButtonBuilder()
                    .setCustomId('closeTicket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );


        await ticketChannel.send({
            content: `<@&${process.env.STAFF_ROLE_ID}> | New ticket from ${user}`,
            embeds: [ticketEmbed],
            components: [ticketButtons]
        });


        return interaction.editReply({ 
            content: `Your ticket has been created: ${ticketChannel}`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error creating ticket:', error);
        return interaction.editReply({ 
            content: 'An error occurred while creating your ticket. Please try again.',
            ephemeral: true
        });
    }
}

// Ticket close handler
async function handleTicketClose(interaction) {
    if (!interaction.channel.name.includes('ticket-')) {
        return interaction.reply({
            content: 'This command can only be used in ticket channels!',
            ephemeral: true
        });
    }

    const closeEmbed = new EmbedBuilder()
        .setTitle('Close Confirmation')
        .setDescription('Are you sure you want to close this ticket?')
        .setColor(Colors.Yellow)
        .setTimestamp();

    const confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirmClose')
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('cancelClose')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );

    await interaction.reply({
        embeds: [closeEmbed],
        components: [confirmButtons]
    });
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    try {
        if (interaction.customId === 'create_ticket') {
            // Defer the reply first
            await interaction.deferReply({ ephemeral: true });
            await handleTicketCreation(interaction);
        } else if (interaction.customId === 'closeTicket') {
            await handleTicketClose(interaction);
        } else if (interaction.customId === 'claimTicket') {
            await handleTicketClaim(interaction);
        } else if (interaction.customId === 'confirmClose') {
            await confirmTicketClose(interaction);
        } else if (interaction.customId === 'cancelClose') {
            await cancelTicketClose(interaction);
        }
    } catch (error) {
        console.error('Error handling button interaction:', error);
        
        try {
            if (interaction.deferred) {
                await interaction.editReply({ 
                    content: 'An error occurred. Please try again.',
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'An error occurred. Please try again.',
                    ephemeral: true 
                });
            }
        } catch (e) {
            console.error('Error sending error message:', e);
        }
    }
});


async function handleTicketClaim(interaction) {
    // Check if user has staff role
    if (!interaction.member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
        return interaction.reply({
            content: '❌ Only staff members can claim tickets!',
            ephemeral: true
        });
    }

    const channel = interaction.channel;
    
    // Check if ticket is already claimed
    if (channel.topic?.includes('Claimed by')) {
        return interaction.reply({
            content: '❌ This ticket has already been claimed!',
            ephemeral: true
        });
    }


    await channel.setTopic(`Claimed by ${interaction.user.tag}`);
    
    const claimedEmbed = new EmbedBuilder()
        .setTitle('🎫 Ticket Claimed')
        .setDescription(`This ticket has been claimed by ${interaction.user}`)
        .addFields(
            { name: 'Staff Member', value: `${interaction.user}`, inline: true },
            { name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor(Colors.Green)
        .setTimestamp();

    await interaction.reply({ embeds: [claimedEmbed] });
}


async function confirmTicketClose(interaction) {
    const channel = interaction.channel;
    

    await saveTranscript(channel, interaction.user);

    const closeEmbed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setDescription(`Ticket closed by ${interaction.user.tag}`)
        .setColor(Colors.Red)
        .setTimestamp();

    await interaction.reply({ embeds: [closeEmbed] });


    setTimeout(() => channel.delete(), 5000);
}

// Function to handle close cancellation
async function cancelTicketClose(interaction) {
    await interaction.reply({
        content: 'Ticket close cancelled!',
        ephemeral: true
    });
}

// Add this function to your code
async function createTicketPanel(interaction) {
    // Check if user has admin permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
            content: 'You need administrator permissions to use this command!', 
            ephemeral: true 
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📝 Support Tickets')
        .setDescription('Need help? Click the button below to create a support ticket!')
        .setColor(Colors.Blue)
        .addFields(
            { name: 'Support Team', value: `<@&${process.env.STAFF_ROLE_ID}>`, inline: true },
            { name: 'Response Time', value: 'Within 24 hours', inline: true }
        )
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Create Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );

    await interaction.channel.send({ 
        embeds: [embed], 
        components: [row] 
    });

    return interaction.reply({ 
        content: 'Ticket panel has been created!', 
        ephemeral: true 
    });
}

async function saveTranscript(channel, closer) {
    try {

        const messages = await channel.messages.fetch({ limit: 100 });
        const transcriptChannel = channel.guild.channels.cache.get(process.env.TRANSCRIPTS_CHANNEL_ID);
        
        if (!transcriptChannel) {
            console.error('Transcript channel not found!');
            return;
        }

        // Create transcript content
        let transcriptContent = `=== Ticket Transcript ===\n`;
        transcriptContent += `Ticket: #${channel.name}\n`;
        transcriptContent += `Closed by: ${closer.tag}\n`;
        transcriptContent += `Date: ${new Date().toLocaleString()}\n`;
        transcriptContent += `============================\n\n`;

        // Add messages to transcript
        const orderedMessages = Array.from(messages.values()).reverse();
        for (const message of orderedMessages) {
            const timestamp = new Date(message.createdTimestamp).toLocaleString();
            transcriptContent += `[${timestamp}] ${message.author.tag}:\n`;
            transcriptContent += `${message.content || '[No content]'}\n`;
            if (message.attachments.size > 0) {
                message.attachments.forEach(attachment => {
                    transcriptContent += `[Attachment: ${attachment.url}]\n`;
                });
            }
            transcriptContent += '\n';
        }

        // Send transcript directly to channel without saving to file
        const transcriptEmbed = new EmbedBuilder()
            .setTitle('📝 Ticket Transcript')
            .setDescription(`Transcript for ticket #${channel.name}`)
            .addFields(
                { name: 'Ticket Owner', value: channel.name.replace('ticket-', ''), inline: true },
                { name: 'Closed By', value: closer.tag, inline: true },
                { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setColor(Colors.Blue)
            .setTimestamp();

        // Send as a text file attachment
        const buffer = Buffer.from(transcriptContent, 'utf8');
        const attachment = new AttachmentBuilder(buffer, { 
            name: `transcript-${channel.name}-${Date.now()}.txt` 
        });

        await transcriptChannel.send({
            embeds: [transcriptEmbed],
            files: [attachment]
        });

    } catch (error) {
        console.error('Error saving transcript:', error);
    }
}

client.login(token);
