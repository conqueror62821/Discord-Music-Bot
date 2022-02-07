import { soundcloud } from "../utils/handlers/SoundCloudUtil";
import { CommandManager } from "../utils/CommandManager";
import { EventsLoader } from "../utils/EventsLoader";
import { ClientUtils } from "../utils/ClientUtils";
import { RawonLogger } from "../utils/RawonLogger";
import { formatMS } from "../utils/formatMS";
import * as config from "../config";
import { Client, ClientOptions } from "discord.js";
import { resolve } from "path";
import got from "got";
import { SpotifyUtil } from "../utils/handlers/SpotifyUtil";

export class Rawon extends Client {
    public readonly config = config;
    public readonly logger = new RawonLogger({ prod: this.config.isProd });
    public readonly request = got;
    public readonly commands = new CommandManager(this, resolve(__dirname, "..", "commands"));
    public readonly events = new EventsLoader(this, resolve(__dirname, "..", "events"));
    public readonly soundcloud = soundcloud;
    public readonly spotify = new SpotifyUtil(this);
    public readonly utils = new ClientUtils(this);

    public constructor(opt: ClientOptions) { super(opt); }

    public build: () => Promise<this> = async () => {
        const start = Date.now();
        this.events.load();
        this.on("ready", () => {
            this.commands.load();
            this.logger.info(`Ready took ${formatMS(Date.now() - start)}`);
        });
        await this.login();
        return this;
    };
}
