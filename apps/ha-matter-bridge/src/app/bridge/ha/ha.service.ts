import { BeforeApplicationShutdown, Injectable, Logger } from "@nestjs/common";
import { Connection, createConnection, createLongLivedTokenAuth, HassEntity, Auth, AuthData, SaveTokensFunc } from "home-assistant-js-websocket";
import { map, Observable, shareReplay } from "rxjs";
import { HaEntitiesService } from "./ha-entities.service";
import { ConfigService } from "@nestjs/config";
import { BridgeConfig } from "../bridge.config";

Object.assign(global, { WebSocket: require('ws') })

export class AddonAuth {

    private _baseAuth: Auth;

    constructor(data: AuthData, saveTokens?: SaveTokensFunc) {
        this._baseAuth = new Auth(data, saveTokens);
    }

    get data(): AuthData {
        return this._baseAuth.data;
    }

    set data(data: AuthData) {
        this._baseAuth.data = data;
    }

    get wsUrl(): string {
        // Convert from http:// -> ws://, https:// -> wss://
        // inside addon, websocket is proxied to /core/websocket instead of /api/websocket
        return `ws${this._baseAuth.data.hassUrl.substr(4)}/core/websocket`;
    }

    get accessToken(): string {
        return this._baseAuth.accessToken;
    }
    get expired(): boolean {
        return this._baseAuth.expired;
    }

    /**
     * Refresh the access token.
     */
    refreshAccessToken(): Promise<void> {
        return this._baseAuth.refreshAccessToken();
    }

    /**
     * Revoke the refresh & access tokens.
     */
    revoke(): Promise<void> {
        return this._baseAuth.revoke();
    }
}

export function createLongLivedTokenAddonAuth(
    hassUrl: string,
    supervisorToken: string,
) {
    return new AddonAuth({
        hassUrl,
        clientId: null,
        expires: Date.now() + 1e11,
        refresh_token: "",
        access_token: supervisorToken,
        expires_in: 1e11,
    });
}

@Injectable()
export class HaService implements BeforeApplicationShutdown {
    private readonly logger = new Logger(HaService.name);
    private connection: Connection;
    readonly entities: HaEntitiesService = new HaEntitiesService(this.logger);

    constructor(private config: ConfigService<BridgeConfig>) {
    }

    async connect() {
        let auth: Auth;

        this.logger.debug("Connecting to Home Assistant");

        const hassUrl = this.config.get("hassUrl");
        const hassAccessToken = this.config.get("hassAccessToken");

        const addon = this.config.get("addon") ?? false;

        if (addon) {
            this.logger.debug(`Connecting to ${hassUrl} from ADDON with access token ${hassAccessToken}`);

            try {
                auth = createLongLivedTokenAddonAuth(hassUrl, hassAccessToken);
            } catch (err) {
                this.logger.error(`Error while getting authentication token for HA websocket server: ${err}`);
                return;
            }
        } else {
            this.logger.debug(`Connecting to ${hassUrl} with access token ${hassAccessToken}`);
            try {
                auth = createLongLivedTokenAuth(hassUrl, hassAccessToken);
            } catch (err) {
                this.logger.error(`Error while getting authentication token for HA websocket server: ${err}`);
                return;
            }
        }

        try {
            this.connection = await createConnection({ auth: auth });
        } catch (err) {
            this.logger.error(`Error while connecting to HA websocket server: ${err}`);
            return;
        }

        this.entities.start(this.connection);
    }

    async beforeApplicationShutdown(signal?: string) {
        await this.stop();
    }

    private async stop() {
        this.connection.close();
    }

    getEntities(): Observable<HassEntity[]> {
        return this.entities.entities.pipe(
            map(entities => {
                return Object.values(entities);
            }),
            shareReplay(1)
        );
    }

    getEntitiesSnapshot(): HassEntity[] {
        return Object.values(this.entities.getEntitiesSnapshot());
    }

    async callService(domain: string, service: string, target?: { [key: string]: string }, params?: { [key: string]: any }) {
        return this.connection.sendMessagePromise({
            "type": "call_service",
            "domain": domain,
            "service": service,
            // Optional
            "target": target,
            // Optional
            "service_data": params,
        });
    }

    /**
     * @deprecated The method should not be used, use entities events instead
     */
    subscribeEvent<T>(callback: (ev: T) => void, eventType?: string) {
        return this.connection.subscribeEvents<T>(callback, eventType)
    }

    /**
     * @deprecated The method should not be used, use entities events instead
     */
    subscribeStateChange(callback: (ev: EntityStateChangeEventData) => void) {
        return this.connection.subscribeEvents<EntityStateChangeEvent>(event => {
            callback(event.data);
        }, "state_changed")
    }
}

/**
 * @deprecated The method should not be used, use entities events instead
 */
export interface EntityStateChangeEvent {
    event_type: string;
    data: EntityStateChangeEventData,
    origin: string;
    time_fired: string;
    context: {
        id: string;
        parent_id?: string;
        user_id?: string;
    };
}

/**
 * @deprecated The method should not be used, use entities events instead
 */
export interface EntityStateChangeEventData {
    entity_id: string;
    new_state: HassEntity;
    old_state: HassEntity;
}
