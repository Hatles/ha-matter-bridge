import { ComposedDevice, Device } from "@project-chip/matter-node.js/device";
import { HassEntity } from "home-assistant-js-websocket";
import { InjectionToken, Logger, Provider, Type } from "@nestjs/common";
import { HaService } from "./ha/ha.service";
import { Observable } from "rxjs";
import { EntityStateChange } from "./ha/ha-entities.service";

export const ENTITY_CONVERTERS: InjectionToken = "ENTITY_CONVERTERS";

export interface EntityConverter {
  canConvert(entity: HassEntity): boolean;

  convert(entity: HassEntity, ha: HaService, logger: Logger, observable: Observable<EntityStateChange>, unregister: Observable<void>): ComposedDevice | Device ;
}

export function registerEntityConverters(...converterTypes: Type<EntityConverter>[]): Provider[] {
  return [
    {
      provide: ENTITY_CONVERTERS,
      useValue: converterTypes
    },
    ...converterTypes
  ];
}
