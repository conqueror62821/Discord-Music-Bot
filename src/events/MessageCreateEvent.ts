import { createEmbed } from "../utils/functions/createEmbed";
import { BaseEvent } from "../structures/BaseEvent";
import { Event } from "../utils/decorators/Event";
import i18n from "../config";
import { Message, User } from "discord.js";

@Event<typeof MessageCreateEvent>("messageCreate")
export class MessageCreateEvent extends BaseEvent {
    public execute(message: Message): Message | undefined {
        this.client.debugLog.logData("info", "MESSAGE_CREATE", [
            ["ID", message.id],
            ["Guild", message.guild ? `${message.guild.name}(${message.guild.id})` : "DM"],
            ["Channel", message.channel.type === "DM" ? "DM" : `${message.channel.name}(${message.channel.id})`],
            ["Author", `${message.author.tag}(${message.author.id})`]
        ]);

        if (message.author.bot || message.channel.type === "DM" || !this.client.commands.isReady) return message;

        if (this.getUserFromMention(message.content)?.id === this.client.user?.id) {
            message
                .reply({
                    embeds: [
                        createEmbed(
                            "info",
                            `👋 **|** ${i18n.__mf("events.createMessage", {
                                author: message.author.toString(),
                                prefix: `\`${this.client.config.mainPrefix}\``
                            })}`
                        )
                    ]
                })
                .catch(e => this.client.logger.error("PROMISE_ERR:", e));
        }

        const pref = this.client.config.altPrefixes.concat(this.client.config.mainPrefix).find(p => {
            if (p === "{mention}") {
                // eslint-disable-next-line prefer-named-capture-group
                const userMention = /<@(!)?\d*?>/.exec(message.content);
                if (userMention?.index !== 0) return false;

                const user = this.getUserFromMention(userMention[0]);

                return user?.id === this.client.user?.id;
            }

            return message.content.startsWith(p);
        });
        if (pref) {
            this.client.commands.handle(message, pref);
        }
    }

    private getUserFromMention(mention: string): User | undefined {
        // eslint-disable-next-line prefer-named-capture-group
        const matches = /^<@!?(\d+)>$/.exec(mention);
        if (!matches) return undefined;

        const id = matches[1];
        return this.client.users.cache.get(id);
    }
}
