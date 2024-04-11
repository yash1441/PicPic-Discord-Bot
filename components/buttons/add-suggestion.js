const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ButtonBuilder, ButtonStyle, bold, inlineCode, codeBlock, channelMention, userMention } = require('discord.js');
require('dotenv').config();

module.exports = {
    cooldown: 10,
    data: {
        name: 'add-suggestion',
    },
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = await interaction.client.channels.fetch(process.env.VOTE_SUGGESTION_ID);
        const availableTags = channel.availableTags;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('suggestion-category')
            .setPlaceholder('Select a suggestion category');

        for (const tag of availableTags) {
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(tag.name)
                    .setValue(tag.name)
            );
        }

        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        const modal = new ModalBuilder().setCustomId('suggestion-modal');

        const modalRow1 = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setPlaceholder('Give your suggestion a short title'));
        const modalRow2 = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setPlaceholder('Explain your suggestion in detail here'));

        modal.addComponents(modalRow1, modalRow2);

        await interaction.editReply({ content: '**Suggestion Category**', components: [row] });

        const botReply = await interaction.fetchReply();

        const collector = botReply.createMessageComponentCollector({ time: 10_000, componentType: ComponentType.StringSelect });

        collector.on('collect', async (selectMenuInteraction) => {
            const category = selectMenuInteraction.values[0];
            modal.setTitle(category);

            await interaction.editReply({ content: userMention(selectMenuInteraction.user.id) + ' has selected ' + inlineCode(category), components: [] });

            await selectMenuInteraction.showModal(modal);

            const modalReply = await selectMenuInteraction.awaitModalSubmit({ time: 60_000, filter: (modalInteraction) => modalInteraction.user.id === selectMenuInteraction.user.id }).catch(() => {
                interaction.editReply({ content: 'The form has expired.', components: [] });
                setTimeout(() => interaction.deleteReply(), 10_000);
                return null;
            });

            if (!modalReply) return;

            await modalReply.reply({ content: bold(modal.data.title), ephemeral: true })

            await modalReply.deleteReply();

            await interaction.editReply({ content: 'Your suggestion has been submitted. Please wait for an admin to approve or deny it. If approved, it should be visible in ' + channelMention(process.env.VOTE_SUGGESTION_ID) + ' shortly.\n\n' + bold(modal.data.title) + '\n' + codeBlock((modalReply.fields.getTextInputValue('description').length < 2000) ? modalReply.fields.getTextInputValue('description') : (modalReply.fields.getTextInputValue('description').slice(0, 1000) + '...') )  });

            collector.stop();

            await sendSuggestionAdmin(modalReply, modal.data.title);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && !collected.size) {
                interaction.editReply({ content: 'The selection has expired.', components: [] });
                setTimeout(() => interaction.deleteReply(), 10_000);
            };
        });
    },
};

async function sendSuggestionAdmin(interaction, category) {
    const user = interaction.user;
    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .addFields({ name: 'Category', value: category, inline: true })
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setFooter({ text: user.id })
        .setColor(process.env.EMBED_COLOR);

    const approveButton = new ButtonBuilder()
        .setCustomId('approve-suggestion')
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success);

    const denyButton = new ButtonBuilder()
        .setCustomId('deny-suggestion')
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger);
    
    const row = new ActionRowBuilder().addComponents(approveButton, denyButton);

    const channel = await interaction.client.channels.fetch(process.env.DECIDE_SUGGESTION_ID);
    await channel.send({ embeds: [embed], components: [row] });
}