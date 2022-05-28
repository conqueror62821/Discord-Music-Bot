import { haveQueue, inVC, sameVC } from "../../utils/decorators/MusicUtil";
import { CommandContext } from "../../structures/CommandContext";
import { createEmbed } from "../../utils/functions/createEmbed";
import { BaseCommand } from "../../structures/BaseCommand";
import { Command } from "../../utils/decorators/Command";
import { play } from "../../utils/handlers/GeneralUtil";
import { QueueSong } from "../../typings";
import i18n from "../../config";
import { AudioPlayerPlayingState } from "@discordjs/voice";
import { Message } from "discord.js";

@Command({
    aliases: ["st"],
    description: i18n.__("commands.music.skipTo.description"),
    name: "skipto",
    slash: {
        options: [
            {
                description: i18n.__("commands.music.skipTo.slashFirstDescription"),
                name: "first",
                type: "SUB_COMMAND"
            },
            {
                description: i18n.__("commands.music.skipTo.slashLastDescription"),
                name: "last",
                type: "SUB_COMMAND"
            },
            {
                description: i18n.__("commands.music.skipTo.slashSpecificDescription"),
                name: "specific",
                options: [
                    {
                        description: i18n.__("commands.music.skipTo.slashPositionDescription"),
                        name: "position",
                        required: true,
                        type: "NUMBER"
                    }
                ],
                type: "SUB_COMMAND"
            }
        ]
    },
    usage: i18n.__mf("commands.music.skipTo.usage", { options: "first | last" })
})
export class SkipToCommand extends BaseCommand {
    @inVC
    @haveQueue
    @sameVC
    public async execute(ctx: CommandContext): Promise<Message | undefined> {
        const djRole = await this.client.utils.fetchDJRole(ctx.guild!);
        if (
            this.client.data.data?.[ctx.guild!.id]?.dj?.enable &&
            !ctx.member?.roles.cache.has(djRole?.id ?? "") &&
            !ctx.member?.permissions.has("MANAGE_GUILD")
        ) {
            return ctx.reply({
                embeds: [createEmbed("error", i18n.__("commands.music.skipTo.noPermission"), true)]
            });
        }

        const targetType =
            (ctx.args[0] as string | undefined) ?? ctx.options?.getSubcommand() ?? ctx.options?.getNumber("position");
        if (!targetType) {
            return ctx.reply({
                embeds: [
                    createEmbed(
                        "warn",
                        i18n.__mf("reusable.invalidUsage", {
                            prefix: `${this.client.config.mainPrefix}help`,
                            name: `${this.meta.name}`
                        })
                    )
                ]
            });
        }

        const songs = [...ctx.guild!.queue!.songs.sortByIndex().values()];
        if (
            !["first", "last"].includes(String(targetType).toLowerCase()) &&
            !isNaN(Number(targetType)) &&
            !songs[Number(targetType) - 1]
        ) {
            return ctx.reply({
                embeds: [createEmbed("error", i18n.__("commands.music.skipTo.noSongPosition"), true)]
            });
        }

        let song: QueueSong;
        if (String(targetType).toLowerCase() === "first") {
            song = songs[0];
        } else if (String(targetType).toLowerCase() === "last") {
            song = songs[songs.length - 1];
        } else {
            song = songs[Number(targetType) - 1];
        }

        if (
            song.key ===
            ((ctx.guild!.queue!.player.state as AudioPlayerPlayingState).resource.metadata as QueueSong).key
        ) {
            return ctx.reply({
                embeds: [createEmbed("error", i18n.__("commands.music.skipTo.cantPlay"), true)]
            });
        }

        void play(ctx.guild!, song.key);

        return ctx.reply({
            embeds: [
                createEmbed(
                    "success",
                    `⏭ **|** ${i18n.__mf("commands.music.skipTo.skipMessage", {
                        song: `[${song.song.title}](${song.song.url})`
                    })}`
                ).setThumbnail(song.song.thumbnail)
            ]
        });
    }
}
