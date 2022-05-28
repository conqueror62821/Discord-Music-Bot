import { parseHTMLElements } from "../../utils/functions/parseHTMLElements";
import { ButtonPagination } from "../../utils/structures/ButtonPagination";
import { haveQueue, inVC, sameVC } from "../../utils/decorators/MusicUtil";
import { CommandContext } from "../../structures/CommandContext";
import { createEmbed } from "../../utils/functions/createEmbed";
import { BaseCommand } from "../../structures/BaseCommand";
import { Command } from "../../utils/decorators/Command";
import { chunk } from "../../utils/functions/chunk";
import { QueueSong } from "../../typings";
import i18n from "../../config";
import { AudioPlayerState, AudioResource } from "@discordjs/voice";
import { Util } from "discord.js";

@Command({
    description: i18n.__("commands.music.remove.description"),
    name: "remove",
    slash: {
        options: [
            {
                description: i18n.__("commands.music.remove.slashPositionsDescription"),
                name: "positions",
                required: true,
                type: "STRING"
            }
        ]
    },
    usage: i18n.__("commands.music.remove.usage")
})
export class RemoveCommand extends BaseCommand {
    @inVC
    @haveQueue
    @sameVC
    public async execute(ctx: CommandContext): Promise<void> {
        const djRole = await this.client.utils.fetchDJRole(ctx.guild!);
        if (
            this.client.data.data?.[ctx.guild!.id]?.dj?.enable &&
            !ctx.member?.roles.cache.has(djRole?.id ?? "") &&
            !ctx.member?.permissions.has("MANAGE_GUILD")
        ) {
            void ctx.reply({
                embeds: [createEmbed("error", i18n.__("commands.music.remove.noPermission"), true)]
            });
            return;
        }

        const positions = (ctx.options?.getString("positions") ?? ctx.args.join(" ")).split(/[, ]/).filter(Boolean);
        if (!positions.length) {
            void ctx.reply({
                embeds: [createEmbed("error", i18n.__("commands.music.remove.noPositions"), true)]
            });
            return;
        }

        const cloned = [...ctx.guild!.queue!.songs.sortByIndex().values()];
        const songs = positions.map(x => cloned[parseInt(x) - 1]).filter(Boolean);
        for (const song of songs) {
            ctx.guild!.queue!.songs.delete(song.key);
        }

        const np = (
            ctx.guild?.queue?.player.state as (AudioPlayerState & { resource: AudioResource | undefined }) | undefined
        )?.resource?.metadata as QueueSong | undefined;
        const isSkip = songs.map(x => x.key).includes(np?.key ?? "");
        if (isSkip) {
            this.client.commands.get("skip")?.execute(ctx);
        }

        const opening = `${i18n.__mf("commands.music.remove.songsRemoved", {
            removed: songs.length
        })}`;
        const pages = await Promise.all(
            chunk(songs, 10).map(async (v, i) => {
                const texts = await Promise.all(
                    v.map(
                        (song, index) =>
                            `${isSkip ? i18n.__("commands.music.remove.songSkip") : ""}${
                                i * 10 + (index + 1)
                            }.) ${Util.escapeMarkdown(parseHTMLElements(song.song.title))}`
                    )
                );

                return texts.join("\n");
            })
        );
        const getText = (page: string): string => `\`\`\`\n${page}\`\`\``;
        const embed = createEmbed("info", getText(pages[0]))
            .setAuthor(opening)
            .setFooter({
                text: `• ${i18n.__mf("reusable.pageFooter", {
                    actual: 1,
                    total: pages.length
                })}`
            });
        const msg = await ctx.reply({ embeds: [embed] }).catch(() => undefined);

        if (!msg) return;
        void new ButtonPagination(msg, {
            author: ctx.author.id,
            edit: (i, e, p) => {
                e.setDescription(getText(p)).setFooter({
                    text: `• ${i18n.__mf("reusable.pageFooter", {
                        actual: i + 1,
                        total: pages.length
                    })}`
                });
            },
            embed,
            pages
        }).start();
    }
}
