import { BeforeApplicationShutdown, Injectable, Logger } from "@nestjs/common";
import { Connection, createConnection, createLongLivedTokenAuth, HassEntity, Store } from "home-assistant-js-websocket";
import { map, Observable, shareReplay } from "rxjs";
import { getParameter } from "../utils";
import { HaEntitiesService } from "./ha-entities.service";

Object.assign(global, { WebSocket: require('ws') })

@Injectable()
export class HaService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(HaService.name);
  private connection: Connection;
  readonly entities: HaEntitiesService = new HaEntitiesService(this.logger);

  async connect() {
    let auth;

    try {
      // Try to pick up authentication after user logs in
      auth = await createLongLivedTokenAuth(
        getParameter("hassUrl", "http://192.168.1.45:8123"),
        getParameter("hassAccessToken", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI5NDkyNDkxY2ZlNGU0MTEwYmY5N2FiNWZiZjJlYTQ4ZiIsImlhdCI6MTY5OTcxNzcxMiwiZXhwIjoyMDE1MDc3NzEyfQ.mqzd29R9-2kcWHOdGSjKtEyWF8HtXu_vYG0voTKkBzk"),
      );
    } catch (err) {
      console.error(`Unknown error: ${err}`);
      return;
    }

    try {
      this.connection = await createConnection({ auth });
    } catch (err) {
      console.error(`Unknown error: ${err}`);
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

  async callService(domain: string, service: string, target?: {[key: string]: string}, params?: {[key: string]: any}) {
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
