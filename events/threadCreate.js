const { Events, ChannelType } = require('discord.js');
const lark = require('../utils/lark.js');
require('dotenv').config();

module.exports = {
    name: Events.ThreadCreate,
    async execute(thread) {
        if (thread.parent.type != ChannelType.GuildForum || thread.parentId != process.env.VOTE_SUGGESTION_ID) return;

        const message = await thread.fetchStarterMessage();
        const embed = await message.embeds[0];

        if (!embed) return;

        await message.react('✅').then(message.react('❌'));

        const tag = thread.parent.availableTags.find(tag => tag.id == thread.appliedTags[0]);

        const data = {
            "Suggestion Title": thread.name,
            "Suggestion Details": embed.data.description,
            "Category": tag.name,
            "✅": 0,
            "❌": 0,
            "Discord ID": embed.data.footer.text,
            "Discord Name": embed.data.author.name
        };

        const success = await lark.createRecord(process.env.FEEDBACK_POOL_BASE, process.env.SUGGESTIONS_TABLE, { fields: data })

        if (!success) console.log("Failed to create record in lark");
    }
};