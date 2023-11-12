// additional commands to be allowed for registering and triggering handlers

import { DeviceTypes, EndpointOptions, OnOffBaseDevice, getClusterInitialAttributeValues } from "@project-chip/matter-node.js/device";
import { LevelControl, OnOff, ColorControl, AttributeInitialValues, ClusterServerHandlers, createDefaultOnOffClusterServer, createDefaultLevelControlClusterServer } from "@project-chip/matter-node.js/cluster";
import { ClusterId } from "@project-chip/matter-node.js/datatype";
// import { extendPublicHandlerMethods } from "@project-chip/matter-node.js/util";
import { extendPublicHandlerMethods } from "./NamedHandler";
import { createDefaultColorControlClusterServer } from "../cluster/server/color-control-server";

export type DimmableDeviceCommands = {
  moveToLevel: ClusterServerHandlers<typeof LevelControl.Complete>["moveToLevel"];
  move: ClusterServerHandlers<typeof LevelControl.Complete>["move"];
  step: ClusterServerHandlers<typeof LevelControl.Complete>["step"];
  stop: ClusterServerHandlers<typeof LevelControl.Complete>["stop"];
  moveToLevelWithOnOff: ClusterServerHandlers<typeof LevelControl.Complete>["moveToLevelWithOnOff"];
  moveWithOnOff: ClusterServerHandlers<typeof LevelControl.Complete>["moveWithOnOff"];
  stepWithOnOff: ClusterServerHandlers<typeof LevelControl.Complete>["stepWithOnOff"];
  stopWithOnOff: ClusterServerHandlers<typeof LevelControl.Complete>["stopWithOnOff"];
};

export class DimmableBaseDevice extends extendPublicHandlerMethods<typeof OnOffBaseDevice, DimmableDeviceCommands>(OnOffBaseDevice) {
  protected override addDeviceClusters(
    attributeInitialValues?: { [key: ClusterId]: AttributeInitialValues<any> },
    excludeList: ClusterId[] = [],
  ) {
    super.addDeviceClusters(attributeInitialValues, [...excludeList, OnOff.Cluster.id, LevelControl.Cluster.id]);
    if (!excludeList.includes(OnOff.Cluster.id)) {
      this.addClusterServer(
        createDefaultOnOffClusterServer(
          this.commandHandler,
          getClusterInitialAttributeValues(
            attributeInitialValues,
            OnOff.Cluster.with(OnOff.Feature.LevelControlForLighting),
          ),
        ),
      );
    }
    if (!excludeList.includes(LevelControl.Cluster.id)) {
      this.addClusterServer(
        createDefaultLevelControlClusterServer(
          this.commandHandler,
          getClusterInitialAttributeValues(
            attributeInitialValues,
            LevelControl.Cluster.with(LevelControl.Feature.OnOff, LevelControl.Feature.Lighting),
          ),
        ),
      );
    }
  }

  getCurrentLevel() {
    return this.getClusterServer(LevelControl.Cluster)?.getCurrentLevelAttribute() ?? 0;
  }

  setCurrentLevel(level: number | null) {
    this.getClusterServer(LevelControl.Cluster)?.setCurrentLevelAttribute(level);
  }

  /**
   * Adds a listener for the CurrentLevel attribute
   *
   * @param listener Listener function to be called when the attribute changes
   */
  addCurrentLevelListener(listener: (newValue: number | null, oldValue: number | null) => void) {
    const cluster = this.getClusterServer(LevelControl.Cluster);
    this.getClusterServer(LevelControl.Cluster)?.subscribeCurrentLevelAttribute(listener);
  }
}

export type ColorTemperatureDeviceCommands = {
  moveToColorTemperature: ClusterServerHandlers<typeof ColorControl.Complete>["moveToColorTemperature"];
  moveColorTemperature: ClusterServerHandlers<typeof ColorControl.Complete>["moveColorTemperature"];
  stepColorTemperature: ClusterServerHandlers<typeof ColorControl.Complete>["stepColorTemperature"];
};

export class ColorTemperatureBaseDevice extends extendPublicHandlerMethods<typeof DimmableBaseDevice, ColorTemperatureDeviceCommands>(DimmableBaseDevice) {

  protected override addDeviceClusters(
    attributeInitialValues?: { [key: ClusterId]: AttributeInitialValues<any> },
    excludeList: ClusterId[] = [],
  ) {
    super.addDeviceClusters(attributeInitialValues, [...excludeList, ColorControl.Cluster.id]);
    if (!excludeList.includes(ColorControl.Cluster.id)) {
      this.addClusterServer(
        createDefaultColorControlClusterServer(
          this.commandHandler as any,
          getClusterInitialAttributeValues(
            attributeInitialValues,
            ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature),
          ),
        ),
      );
    }
  }

  // result[`get${capitalizedAttributeName}Attribute`] = (fabric: Fabric) =>
  //   (attributes as any)[attributeName].getLocalForFabric(fabric);
  // result[`set${capitalizedAttributeName}Attribute`] = <T>(value: T, fabric: Fabric) =>
  //   (attributes as any)[attributeName].setLocalForFabric(value, fabric);
  // result[`subscribe${capitalizedAttributeName}Attribute`] = <T>(
  //   listener: (newValue: T, oldValue: T) => void,
  // ) => (attributes as any)[attributeName].addValueSetListener(listener);

  getColorTemperatureMireds() {
    const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature));
    return clusterServer?.getColorTemperatureMiredsAttribute();
  }

  setColorTemperatureMireds(mireds: number | null) {
    const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature));
    clusterServer?.setColorTemperatureMiredsAttribute(mireds);
  }

  /**
   * Adds a listener for the CurrentLevel attribute
   *
   * @param listener Listener function to be called when the attribute changes
   */
  addColorTemperatureMiredsListener(listener: (newValue: number | null, oldValue: number | null) => void) {
    const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature));
    clusterServer?.subscribeColorTemperatureMiredsAttribute(listener);
  }

}

export class ColorTemperatureLightDevice extends ColorTemperatureBaseDevice {
  constructor(
    onOffAttributeInitialValues?: AttributeInitialValues<typeof OnOff.Cluster.attributes>,
    dimmableAttributeValues?: AttributeInitialValues<typeof LevelControl.Cluster.attributes>,
    colorTemperatureAttributeValues?: AttributeInitialValues<typeof ColorControl.Cluster.attributes>,
    options: EndpointOptions = {},
  ) {
    const initialAttributeValues: { [key: ClusterId]: AttributeInitialValues<any> } = {};
    if (onOffAttributeInitialValues !== undefined) {
      initialAttributeValues[OnOff.Cluster.id] = onOffAttributeInitialValues;
    }
    if (dimmableAttributeValues !== undefined) {
      initialAttributeValues[LevelControl.Cluster.id] = dimmableAttributeValues;
    }
    if (colorTemperatureAttributeValues !== undefined) {
      initialAttributeValues[ColorControl.Cluster.id] = colorTemperatureAttributeValues;
    }
    super(DeviceTypes.COLOR_TEMPERATURE_LIGHT, initialAttributeValues, options);
  }
}
