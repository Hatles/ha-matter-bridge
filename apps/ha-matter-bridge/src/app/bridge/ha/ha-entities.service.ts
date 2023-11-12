import { Collection, Connection, Context, getCollection, HassEntities, HassEntity, Store, UnsubscribeFunc } from "home-assistant-js-websocket";
import { BehaviorSubject, filter, map, Observable, shareReplay, Subject } from "rxjs";
import { Logger } from "@nestjs/common";

interface EntityState {
  /** state */
  s: string;
  /** attributes */
  a: { [key: string]: any };
  /** context */
  c: Context | string;
  /** last_changed; if set, also applies to lu */
  lc: number;
  /** last_updated */
  lu: number;
}

interface EntityStateRemove {
  /** attributes */
  a: string[];
}

interface EntityDiff {
  /** additions */
  "+"?: Partial<EntityState>;
  /** subtractions */
  "-"?: EntityStateRemove;
}

interface StatesUpdates {
  /** add */
  a?: Record<string, EntityState>;
  /** remove */
  r?: string[]; // remove
  /** change */
  c: Record<string, EntityDiff>;
}

export interface EntityStateChange extends HassEntity {
  old_state: HassEntity;
  new_state: HassEntity;
}

type EntitiesStateChanges = { [key: string]: EntityStateChange };

export class HaEntitiesService {
  protected logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }

  entitiesCollection: Collection<HassEntities>;

  private _entities = new BehaviorSubject<HassEntities>({});
  entities = this._entities.asObservable().pipe(shareReplay(1));
  private _entitiesStateChanges = new Subject<HassEntities>();
  entitiesStateChanges = this._entitiesStateChanges.asObservable().pipe(shareReplay(1));
  private _entitiesRegistered = new Subject<HassEntity[]>();
  entitiesRegistered = this._entitiesRegistered.asObservable().pipe(shareReplay(1));
  private _entitiesUnregistered = new Subject<HassEntity[]>();
  entitiesUnregistered = this._entitiesUnregistered.asObservable().pipe(shareReplay(1));

  private subscription: UnsubscribeFunc;

  start(connection: Connection) {
    if (this.subscription) {
      this.logger.log("HaEntitiesService already started");
      return;
    }

    const subscribeUpdates = (conn: Connection, store: Store<HassEntities>) =>
      conn.subscribeMessage<StatesUpdates>((ev) => {
        try {
          this.processEvent(store, ev);
        }
        catch (e) {
          this.logger.error("Error while updating entities state", e);
        }
      }, {
        type: "subscribe_entities",
      });

    this.entitiesCollection = getCollection(connection, "_entities", undefined, subscribeUpdates);
    this.subscription = this.entitiesCollection.subscribe((entities) => {});
  }

  stop() {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
  }

  private processEvent(store: Store<HassEntities>, updates: StatesUpdates) {
    const state: HassEntities = { ...store.state };
    let updatedEntities: EntitiesStateChanges = {};
    let removedEntities: HassEntities = {};
    let addedEntities: HassEntities = {};

    if (updates.a) {
      for (const entityId in updates.a) {
        const newState = updates.a[entityId];
        let last_changed = new Date(newState.lc * 1000).toISOString();
        state[entityId] = {
          entity_id: entityId,
          state: newState.s,
          attributes: newState.a,
          context:
            typeof newState.c === "string"
              ? { id: newState.c, parent_id: null, user_id: null }
              : newState.c,
          last_changed: last_changed,
          last_updated: newState.lu
            ? new Date(newState.lu * 1000).toISOString()
            : last_changed,
        };

        addedEntities[entityId] = state[entityId];
      }
    }

    if (updates.r) {
      for (const entityId of updates.r) {
        const entityState = state[entityId];
        if (entityState) {
          removedEntities[entityId] = entityState;
        }

        delete state[entityId];
      }
    }

    if (updates.c) {
      for (const entityId in updates.c) {
        let entityState: HassEntity = state[entityId];

        if (!entityState) {
          console.warn("Received state update for unknown entity", entityId);
          continue;
        }

        const oldState: HassEntity = { ...entityState };
        entityState = { ...entityState };

        const { "+": toAdd, "-": toRemove } = updates.c[entityId];
        const attributesChanged = toAdd?.a || toRemove?.a;
        const attributes = attributesChanged
          ? { ...entityState.attributes }
          : entityState.attributes;

        if (toAdd) {
          if (toAdd.s !== undefined) {
            entityState.state = toAdd.s;
          }
          if (toAdd.c) {
            if (typeof toAdd.c === "string") {
              entityState.context = { ...entityState.context, id: toAdd.c };
            } else {
              entityState.context = { ...entityState.context, ...toAdd.c };
            }
          }
          if (toAdd.lc) {
            entityState.last_updated = entityState.last_changed = new Date(
              toAdd.lc * 1000,
            ).toISOString();
          } else if (toAdd.lu) {
            entityState.last_updated = new Date(toAdd.lu * 1000).toISOString();
          }
          if (toAdd.a) {
            Object.assign(attributes, toAdd.a);
          }
        }
        if (toRemove?.a) {
          for (const key of toRemove.a) {
            delete attributes[key];
          }
        }
        if (attributesChanged) {
          entityState.attributes = attributes;
        }

        const newState = { ...entityState };

        updatedEntities[entityId] = {
          ...entityState,
          old_state: oldState,
          new_state: newState
        }

        state[entityId] = entityState;
      }
    }

    store.setState(state, true);

    this._entities.next(state);
    this._entitiesStateChanges.next(updatedEntities);
    this._entitiesUnregistered.next(removedEntities);
    this._entitiesRegistered.next(addedEntities);
  }

  getEntityChanges(entityId: string): Observable<EntityStateChange> {
    return this.entitiesStateChanges.pipe(map(changes => changes[entityId]), filter(state => state), shareReplay(1));
  }
  getEntityUnregistered(entityId: string): Observable<EntityStateChange> {
    return this.entitiesUnregistered.pipe(map(changes => changes[entityId]), filter(state => state), shareReplay(1));
  }

  getEntitiesSnapshot() {
    return this._entities.value;
  }
}
