import { haveQueue, inVC, sameVC } from "../../utils/decorators/MusicUtil";
import { DefineCommand } from "../../utils/decorators/DefineCommand";
import { CommandContext } from "../../structures/CommandContext";
import { BaseCommand } from "../../structures/BaseCommand";
import { createEmbed } from "../../utils/createEmbed";
import { IQueueSong } from "../../typings";
import { AudioPlayerPlayingState } from "@discordjs/voice";
import { GuildMember } from "discord.js";
import i18n from "../../config";

@DefineCommand({
    aliases: ["s"],
    description: i18n.__("commands.music.skip.description"),
    name: "skip",
    slash: {
        options: []
    },
    usage: "{prefix}skip"
})
export class SkipCommand extends BaseCommand {
    @inVC()
    @haveQueue()
    @sameVC()
    public async execute(ctx: CommandContext): Promise<void> {
        const djRole = await this.client.utils.fetchDJRole(ctx.guild!).catch(() => null);
        const song = (ctx.guild!.queue!.player!.state as AudioPlayerPlayingState).resource.metadata as IQueueSong;

        function ableToSkip(member: GuildMember): boolean {
            return member.roles.cache.has(djRole?.id as string) || member.permissions.has("MANAGE_GUILD") || (song.requester.id === member.id);
        }

        if (!ableToSkip(ctx.member!)) {
            const required = this.client.utils.requiredVoters(ctx.guild!.me!.voice.channel!.members.size);

            if (ctx.guild?.queue?.skipVoters.includes(ctx.author.id)) {
                ctx.guild.queue.skipVoters = ctx.guild.queue.skipVoters.filter(x => x !== ctx.author.id);
                await ctx.reply(i18n.__mf("commands.music.skip.voteMessage", { actual: ctx.guild.queue.skipVoters.length, required }));

                return;
            }

            ctx.guild?.queue?.skipVoters.push(ctx.author.id);

            const length = ctx.guild!.queue!.skipVoters.length;
            await ctx.reply(i18n.__mf("commands.music.skip.voteResultMessage", { length, required }));

            if (length < required) return;
        }

        if (!ctx.guild?.queue?.playing) ctx.guild!.queue!.playing = true;
        ctx.guild?.queue?.player?.stop(true);
        void ctx.reply({ embeds: [createEmbed("info", `⏭ **|** ${i18n.__mf("commands.music.skip.skipMessage", { song: `[${song.song.title}](${song.song.url}})` })}`).setThumbnail(song.song.thumbnail)] }).catch(e => this.client.logger.error("SKIP_CMD_ERR:", e));
    }
}
