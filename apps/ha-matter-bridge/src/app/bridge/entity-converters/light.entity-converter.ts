import { EntityConverter } from "../entity-converter";
import { HassEntity } from "home-assistant-js-websocket";
import { Injectable, Logger } from "@nestjs/common";
import { HaService } from "../ha/ha.service";
import { Observable } from "rxjs";
import { DimmableLightDevice, OnOffLightDevice } from "@project-chip/matter-node.js/device";
import { ColorTemperatureLightDevice } from "../devices/colorable-devices";
import { EntityStateChange } from "../ha/ha-entities.service";
import { DeviceUpdater } from "./device-updater";

@Injectable()
export class LightEntityConverter implements EntityConverter {

  canConvert(entity: HassEntity): boolean {
    // register if is light device
    if (
      (entity.attributes.device_class === "light" || entity.entity_id.startsWith('light.'))
      // && entity.entity_id === "light.hue_color_chambre_etienne"
    ) {
      return true;
    }

    return false;
  }

  convert(entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>) {
    const deviceUpdater = new DeviceUpdater(logger);

    const colorModes: string[] = entity.attributes.supported_color_modes || [];

    const dimmable = colorModes.some(mode => mode === 'brightness');
    if (dimmable) {
      return this.registerDimmableLight(entity, ha, logger, entityState, unregister, deviceUpdater);
    }

    const colorTemperature = colorModes.some(mode => mode === 'color_temp');
    if (colorTemperature) {
      return this.registerColorTemperatureLight(entity, ha, logger, entityState, unregister, deviceUpdater);
    }

    const colorXY = colorModes.some(mode => mode === 'xy');
    // if (colorXY) {
    //   return this.registerColorXYLight(entity, ha, logger, entityState, unregister, deviceUpdater);
    // }

    return this.registerOnOffLight(entity, ha, logger, entityState, unregister, deviceUpdater);
  }

  private registerOnOffLight(entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>, updater: DeviceUpdater) {
    const onOffLightDevice =  new OnOffLightDevice();

    this.addOnOffLightCapacities(onOffLightDevice, entity, ha, logger, entityState, unregister, updater);

    return onOffLightDevice;
  }
  private registerDimmableLight(entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>, updater: DeviceUpdater) {
    const dimmableLightDevice =  new DimmableLightDevice();

    this.addOnOffLightCapacities(dimmableLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addDimmableLightCapacities(dimmableLightDevice, entity, ha, logger, entityState, unregister, updater);

    return dimmableLightDevice;
  }

  private registerColorTemperatureLight(entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>, updater: DeviceUpdater) {
    const colorTemperatureLightDevice =  new ColorTemperatureLightDevice(null, null, {
      colorTemperatureMireds: 200,
      colorTempPhysicalMaxMireds: entity.attributes.max_mireds,
      colorTempPhysicalMinMireds: entity.attributes.min_mireds,
    } as any);

    this.addOnOffLightCapacities(colorTemperatureLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addDimmableLightCapacities(colorTemperatureLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addColorTemperatureLightCapacities(colorTemperatureLightDevice, entity, ha, logger, entityState, unregister, updater);

    return colorTemperatureLightDevice;
  }

  private addOnOffLightCapacities(device: IOnOffLightDevice, entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>, updater: DeviceUpdater) {

    const onOffUpdater = (entity: HassEntity) => {
      updater.internal(() => {
        const on = entity.state === "on";
          if (device.getOnOff() !== on) {
            device.setOnOff(on);
          }
        }
      );
    }

    // initial value
    onOffUpdater(entity);

    device.addOnOffListener(on => {
      updater.external(() => ha.callService("light", on ? "turn_on" : "turn_off", { entity_id: entity.entity_id }));
    });

    // listen to change state event
    entityState.subscribe(event => {
        onOffUpdater(event.new_state);
    });
  }

  private addDimmableLightCapacities(device: IDimmableLightDevice, entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>, updater: DeviceUpdater) {

    const levelUpdater = (entity: HassEntity) => {
      updater.internal(() => {
          const level = entity.attributes.brightness;
          if (level && device.getCurrentLevel() !== level) {
            device.setCurrentLevel(level);
          }
        }
      );
    }

    // initial value
    levelUpdater(entity);

    device.addCurrentLevelListener(level => {
      updater.external(() => ha.callService("light", "turn_on", { entity_id: entity.entity_id }, { brightness: level }));
    });

    // listen to change state event
    entityState.subscribe(event => {
      levelUpdater(event.new_state);
    });
  }

  private addColorTemperatureLightCapacities(device: IColorTemperatureLightDevice, entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>, updater: DeviceUpdater) {
    const miredsUpdater = (entity: HassEntity) => {
      updater.internal(() => {
          const mireds = entity.attributes.color_temp;
          if (mireds && device.getColorTemperatureMireds() !== mireds) {
            device.setColorTemperatureMireds(mireds);
          }
        }
      );
    }

    // initial value
    miredsUpdater(entity);

    device.addColorTemperatureMiredsListener(mireds => {
      updater.external(() => ha.callService("light", "turn_on", { entity_id: entity.entity_id }, { color_temp: mireds }));
    });

    // listen to change state event
    entityState.subscribe(event => {
      miredsUpdater(event.new_state);
    });
  }

}

export type IOnOffLightDevice = Pick<OnOffLightDevice, "getOnOff" | "setOnOff" | "addOnOffListener">
export type IDimmableLightDevice = Pick<DimmableLightDevice, "getCurrentLevel" | "setCurrentLevel" | "addCurrentLevelListener">
export type IColorTemperatureLightDevice = Pick<ColorTemperatureLightDevice, "getColorTemperatureMireds" | "setColorTemperatureMireds" | "addColorTemperatureMiredsListener">
