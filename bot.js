const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID; // klyroDevelopment Server ID

// ==================== BOT EVENTS ====================

client.on('ready', () => {
    console.log(`✅ Discord Bot logged in as ${client.user.tag}`);
    client.user.setActivity('für Booster 🚀', { type: 'WATCHING' });
});

// Boost Detection
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    // Prüfe ob Member den Server geboostet hat
    const boostedNow = !oldMember.premiumSince && newMember.premiumSince;

    if (boostedNow) {
        console.log(`🎉 ${newMember.user.username} hat den Server geboostet!`);
        
        try {
            // Generiere License Key
            const response = await axios.post(`${API_URL}/generate-license`, {
                userName: newMember.user.username,
                discordId: newMember.user.id,
                days: 90
            });

            const { key, expiresAt } = response.data;

            // Sende DM mit License Key
            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('🎁 Danke für dein Boost!')
                .setDescription('Du hast den klyroDevelopment Server geboostet und erhältst einen VIP License Key!')
                .addFields(
                    { name: '🔑 Dein License Key', value: `\`${key}\`` },
                    { name: '⏰ Gültig bis', value: new Date(expiresAt).toLocaleDateString('de-DE') },
                    { name: '🌐 Archive Website', value: `${process.env.WEBSITE_URL || 'https://archive.klyrodevelopment.de'}` }
                )
                .setFooter({ text: 'Danke für deine Unterstützung!' })
                .setTimestamp();

            await newMember.user.send({ embeds: [embed] });
            console.log(`✅ License Key an ${newMember.user.username} versendet`);

            // Optional: Sende auch im Server eine Nachricht
            const announceChannel = newMember.guild.channels.cache.find(ch => ch.name === 'announcements' || ch.name === 'general');
            if (announceChannel) {
                const announceEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setDescription(`🎉 **${newMember.user.username}** hat den Server geboostet! Danke für die Unterstützung!`);
                
                announceChannel.send({ embeds: [announceEmbed] });
            }

        } catch (error) {
            console.error('Fehler beim Generieren/Versenden des License Keys:', error);
        }
    }
});

// Slash Commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'license') {
        // Prüfe ob User den Server geboostet hat
        const member = await interaction.guild.members.fetch(interaction.user.id);
        
        if (!member.premiumSince) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('❌ Du musst den Server boostet haben, um einen License Key zu erhalten!');
            
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Generiere License Key
            const response = await axios.post(`${API_URL}/generate-license`, {
                userName: interaction.user.username,
                discordId: interaction.user.id,
                days: 90
            });

            const { key, expiresAt } = response.data;

            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('🔑 Dein License Key')
                .setDescription(`Hier ist dein VIP Access Key für das Archive:`)
                .addFields(
                    { name: 'Key', value: `\`${key}\`` },
                    { name: 'Gültig bis', value: new Date(expiresAt).toLocaleDateString('de-DE') },
                    { name: 'Website', value: process.env.WEBSITE_URL || 'https://archive.klyrodevelopment.de' }
                )
                .setFooter({ text: 'Nutze diesen Key auf der Archive Website' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Fehler:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('❌ Fehler beim Generieren des License Keys');
            
            interaction.editReply({ embeds: [errorEmbed] });
        }
    }

    if (commandName === 'license-info') {
        const keyOption = interaction.options.getString('key');

        await interaction.deferReply({ ephemeral: true });

        try {
            const response = await axios.get(`${API_URL}/license-status/${keyOption}`);
            const { isActive, expiresAt, userName } = response.data;

            const embed = new EmbedBuilder()
                .setColor(isActive ? '#00ff00' : '#ff0000')
                .setTitle('📊 License Key Info')
                .addFields(
                    { name: 'Status', value: isActive ? '✅ Aktiv' : '❌ Inaktiv' },
                    { name: 'Benutzer', value: userName },
                    { name: 'Abläuft am', value: new Date(expiresAt).toLocaleDateString('de-DE') }
                );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Fehler:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('❌ License Key nicht gefunden');
            
            interaction.editReply({ embeds: [errorEmbed] });
        }
    }

    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle('📚 Hilfe - klyroDevelopment Archive')
            .setDescription('Hier sind alle verfügbaren Commands:')
            .addFields(
                { name: '/license', value: 'Erhalte deinen VIP License Key (nur für Booster)', inline: false },
                { name: '/license-info <key>', value: 'Prüfe Infos zu einem License Key', inline: false },
                { name: '/help', value: 'Zeigt diese Hilfe-Nachricht', inline: false }
            )
            .setFooter({ text: 'klyroDevelopment Archive Bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

// ==================== COMMANDS REGISTRIEREN ====================

async function registerCommands() {
    const commands = [
        {
            name: 'license',
            description: 'Erhalte deinen VIP License Key (nur für Booster)'
        },
        {
            name: 'license-info',
            description: 'Prüfe Infos zu einem License Key',
            options: [
                {
                    name: 'key',
                    description: 'Der License Key zum Prüfen',
                    type: 3, // STRING
                    required: true
                }
            ]
        },
        {
            name: 'help',
            description: 'Zeigt Hilfe und alle verfügbaren Commands'
        }
    ];

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        await guild.commands.set(commands);
        console.log('✅ Slash Commands registriert');
    } catch (error) {
        console.error('Fehler beim Registrieren der Commands:', error);
    }
}

client.once('ready', registerCommands);

// Error Handling
client.on('error', error => {
    console.error('❌ Bot Error:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled Rejection:', error);
});

// ==================== BOT STARTEN ====================

client.login(DISCORD_TOKEN);