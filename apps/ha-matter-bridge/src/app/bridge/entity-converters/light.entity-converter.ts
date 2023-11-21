import { EntityConverter } from "../entity-converter";
import { HassEntity } from "home-assistant-js-websocket";
import { Injectable, Logger } from "@nestjs/common";
import { HaService } from "../ha/ha.service";
import { Observable } from "rxjs";
import { DimmableLightDevice, OnOffLightDevice } from "@project-chip/matter-node.js/device";
import { ColorTemperatureLightDevice, HueSaturationColorLightDevice, XyColorLightDevice } from "../devices/colorable-devices";
import { EntityStateChange } from "../ha/ha-entities.service";
import { DeviceUpdater } from "./device-updater";
import { ColorControl } from "@project-chip/matter-node.js/cluster";

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


    const colorXy = colorModes.some(mode => mode === 'xy');
    if (colorXy) {
      // return this.registerXyColorLight(entity, ha, logger, entityState, unregister, deviceUpdater);
      return this.registerHueSaturationColorLight(entity, ha, logger, entityState, unregister, deviceUpdater);
    }

    const colorTemperature = colorModes.some(mode => mode === 'color_temp');
    if (colorTemperature) {
      return this.registerColorTemperatureLight(entity, ha, logger, entityState, unregister, deviceUpdater);
    }

    const dimmable = colorModes.some(mode => mode === 'brightness');
    if (dimmable) {
      return this.registerDimmableLight(entity, ha, logger, entityState, unregister, deviceUpdater);
    }

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
      colorTemperatureMireds: entity.attributes.color_temp,
      colorTempPhysicalMaxMireds: entity.attributes.max_mireds,
      colorTempPhysicalMinMireds: entity.attributes.min_mireds,
    } as any);

    this.addOnOffLightCapacities(colorTemperatureLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addDimmableLightCapacities(colorTemperatureLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addColorTemperatureLightCapacities(colorTemperatureLightDevice, entity, ha, logger, entityState, unregister, updater);

    return colorTemperatureLightDevice;
  }

  private registerXyColorLight(entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>, updater: DeviceUpdater) {
    const xyColorLightDevice =  new XyColorLightDevice(
      null,
      null,
      {
        colorMode: entity.attributes.color_mode === "xy" ? ColorControl.ColorMode.CurrentXAndCurrentY : ColorControl.ColorMode.ColorTemperatureMireds,
        currentX: (entity.attributes.xy_color || [])[0] || 24939,
        currentY: (entity.attributes.xy_color || [])[1] || 24701,

        colorTemperatureMireds: entity.attributes.color_temp || entity.attributes.min_mireds,
        colorTempPhysicalMinMireds: entity.attributes.min_mireds,
        colorTempPhysicalMaxMireds: entity.attributes.max_mireds,
      }
    );

    this.addOnOffLightCapacities(xyColorLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addDimmableLightCapacities(xyColorLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addColorTemperatureLightCapacities(xyColorLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addXyColorLightCapacities(xyColorLightDevice, entity, ha, logger, entityState, unregister, updater);

    return xyColorLightDevice;
  }

  private registerHueSaturationColorLight(entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>, updater: DeviceUpdater) {
    const hueSaturationColorLightDevice =  new HueSaturationColorLightDevice(
      null,
      null,
      {
        colorMode: entity.attributes.color_mode === "xy" /*"hs"*/ ? ColorControl.ColorMode.CurrentHueAndCurrentSaturation : ColorControl.ColorMode.ColorTemperatureMireds,
        currentHue: (entity.attributes.hs_color || [])[0] || 0,
        currentSaturation: (entity.attributes.hs_color || [])[1] || 0,

        colorTemperatureMireds: entity.attributes.color_temp || entity.attributes.min_mireds,
        colorTempPhysicalMinMireds: entity.attributes.min_mireds,
        colorTempPhysicalMaxMireds: entity.attributes.max_mireds,
      }
    );

    this.addOnOffLightCapacities(hueSaturationColorLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addDimmableLightCapacities(hueSaturationColorLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addColorTemperatureLightCapacities(hueSaturationColorLightDevice, entity, ha, logger, entityState, unregister, updater);
    this.addHueSaturationColorLightCapacities(hueSaturationColorLightDevice, entity, ha, logger, entityState, unregister, updater);

    return hueSaturationColorLightDevice;
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

  private addXyColorLightCapacities(device: IXyColorLightDevice, entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>, updater: DeviceUpdater) {
    const xyUpdater = (entity: HassEntity) => {
      updater.internal(() => {
          const xy = entity.attributes.xy_color;
          const currentXy = device.getCurrentXy();
          if (xy && currentXy.x !== xy[0] && currentXy.y !== xy[1]) {
            device.setCurrentXy({ x: xy[0], y: xy[1] });
          }
        }
      );
    }

    // initial value
    xyUpdater(entity);

    device.addCurrentXyListener(xy => {
      updater.external(() => ha.callService("light", "turn_on", { entity_id: entity.entity_id }, { xy_color: [xy.x, xy.y] }));
    });

    // listen to change state event
    entityState.subscribe(event => {
      xyUpdater(event.new_state);
    });
  }

  private addHueSaturationColorLightCapacities(device: IHueSaturationColorLightDevice, entity: HassEntity, ha: HaService, logger: Logger, entityState: Observable<EntityStateChange>, unregister: Observable<void>, updater: DeviceUpdater) {
    const hueSaturationUpdater = (entity: HassEntity) => {
      updater.internal(() => {
          const hueSaturation = entity.attributes.hs_color;
          const currentHueSaturation = device.getCurrentHueSaturation();
          if (hueSaturation && currentHueSaturation.hue !== hueSaturation[0] && currentHueSaturation.saturation !== hueSaturation[1]) {
            device.setCurrentHueSaturation({ hue: hueSaturation[0], saturation: hueSaturation[1] });
          }
        }
      );
    }

    // initial value
    hueSaturationUpdater(entity);

    device.addCurrentHueSaturationListener(hueSaturation => {
      updater.external(() => ha.callService("light", "turn_on", { entity_id: entity.entity_id }, { hs_color: [hueSaturation.hue, hueSaturation.saturation] }));
    });

    // listen to change state event
    entityState.subscribe(event => {
      hueSaturationUpdater(event.new_state);
    });
  }

}

export type IOnOffLightDevice = Pick<OnOffLightDevice, "getOnOff" | "setOnOff" | "addOnOffListener">
export type IDimmableLightDevice = Pick<DimmableLightDevice, "getCurrentLevel" | "setCurrentLevel" | "addCurrentLevelListener">
export type IColorTemperatureLightDevice = Pick<ColorTemperatureLightDevice, "getColorTemperatureMireds" | "setColorTemperatureMireds" | "addColorTemperatureMiredsListener">
export type IXyColorLightDevice = Pick<XyColorLightDevice, "getCurrentXy" | "setCurrentXy" | "addCurrentXyListener">
export type IHueSaturationColorLightDevice = Pick<HueSaturationColorLightDevice, "getCurrentHueSaturation" | "setCurrentHueSaturation" | "addCurrentHueSaturationListener">
