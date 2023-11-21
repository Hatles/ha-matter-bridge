// additional commands to be allowed for registering and triggering handlers

import { DeviceTypes, EndpointOptions, OnOffBaseDevice, getClusterInitialAttributeValues } from "@project-chip/matter-node.js/device";
import {
    LevelControl,
    OnOff,
    ColorControl,
    AttributeInitialValues,
    ClusterServerHandlers,
    createDefaultOnOffClusterServer,
    createDefaultLevelControlClusterServer
} from "@project-chip/matter-node.js/cluster";
import { ClusterId } from "@project-chip/matter-node.js/datatype";
// import { extendPublicHandlerMethods } from "@project-chip/matter-node.js/util";
import { extendPublicHandlerMethods } from "./NamedHandler";
import {
    createDefaultColorTemperatureControlClusterServer,
    createDefaultHueSaturationColorControlClusterServer,
    createDefaultXyColorControlClusterServer
} from "../cluster/server/color-control-server";

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
        this.getClusterServer(LevelControl.Cluster)?.subscribeCurrentLevelAttribute(listener);
    }
}

export type TemperatureColorControlCluster = ColorControl.Extension<{ colorTemperature: true }>;

export type ColorTemperatureDeviceCommands = {
    moveToColorTemperature: ClusterServerHandlers<TemperatureColorControlCluster>["moveToColorTemperature"];
    moveColorTemperature: ClusterServerHandlers<TemperatureColorControlCluster>["moveColorTemperature"];
    stepColorTemperature: ClusterServerHandlers<TemperatureColorControlCluster>["stepColorTemperature"];

    stopMoveStep: ClusterServerHandlers<TemperatureColorControlCluster>["stopMoveStep"];
};

export class ColorTemperatureBaseDevice extends extendPublicHandlerMethods<typeof DimmableBaseDevice, ColorTemperatureDeviceCommands>(DimmableBaseDevice) {

    protected override addDeviceClusters(
        attributeInitialValues?: { [key: ClusterId]: AttributeInitialValues<any> },
        excludeList: ClusterId[] = [],
    ) {
        super.addDeviceClusters(attributeInitialValues, [...excludeList, ColorControl.Cluster.id]);
        if (!excludeList.includes(ColorControl.Cluster.id)) {
            this.addClusterServer(
                createDefaultColorTemperatureControlClusterServer(
                    this.commandHandler as any,
                    getClusterInitialAttributeValues(
                        attributeInitialValues,
                        ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature),
                    ),
                ),
            );
        }
    }

    getColorTemperatureMireds() {
        const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature));
        return clusterServer?.getColorTemperatureMiredsAttribute();
    }

    setColorTemperatureMireds(mireds: number) {
        const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature));
        clusterServer?.setColorTemperatureMiredsAttribute(mireds);
    }

    /**
     * Adds a listener for the CurrentLevel attribute
     *
     * @param listener Listener function to be called when the attribute changes
     */
    addColorTemperatureMiredsListener(listener: (newValue: number, oldValue: number) => void) {
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

export type XyColorControlCluster = ColorControl.Extension<{ colorTemperature: true, xy: true }>;

export type XyColorDeviceCommands = {
    moveToColor: ClusterServerHandlers<XyColorControlCluster>["moveToColor"];
    moveColor: ClusterServerHandlers<XyColorControlCluster>["moveColor"];
    stepColor: ClusterServerHandlers<XyColorControlCluster>["stepColor"];

    // moveToColorTemperature: ClusterServerHandlers<TemperatureColorControlCluster>["moveToColorTemperature"];
    // moveColorTemperature: ClusterServerHandlers<TemperatureColorControlCluster>["moveColorTemperature"];
    // stepColorTemperature: ClusterServerHandlers<TemperatureColorControlCluster>["stepColorTemperature"];
    //
    // stopMoveStep: ClusterServerHandlers<XyColorControlCluster>["stopMoveStep"];
} & ColorTemperatureDeviceCommands;

export class XyColorBaseDevice extends extendPublicHandlerMethods<typeof ColorTemperatureBaseDevice, XyColorDeviceCommands>(ColorTemperatureBaseDevice) {

    protected override addDeviceClusters(
        attributeInitialValues?: { [key: ClusterId]: AttributeInitialValues<any> },
        excludeList: ClusterId[] = [],
    ) {
        super.addDeviceClusters(attributeInitialValues, [...excludeList, ColorControl.Cluster.id]);
        if (!excludeList.includes(ColorControl.Cluster.id)) {
            this.addClusterServer(
                createDefaultXyColorControlClusterServer(
                    this.commandHandler as any,
                    getClusterInitialAttributeValues(
                        attributeInitialValues,
                        ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature, ColorControl.Feature.Xy),
                    ),
                ),
            );
        }
    }

    getCurrentXy(): { x: number, y: number } | null {
        const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.Xy));

        if (clusterServer) {
            return {
                x: clusterServer.getCurrentXAttribute(),
                y: clusterServer.getCurrentYAttribute(),
            }
        }

        return null;
    }

    setCurrentXy(xy: { x: number, y: number } | null) {
        const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.Xy));

        if (clusterServer && xy) {
            clusterServer?.setCurrentXAttribute(xy.x);
            clusterServer?.setCurrentYAttribute(xy.y);
        }
    }

    /**
     * Adds a listener for the CurrentLevel attribute
     *
     * @param listener Listener function to be called when the attribute changes
     */
    addCurrentXyListener(listener: (newValue: { x: number, y: number } | null, oldValue: { x: number, y: number } | null) => void) {
        const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.Xy));

        if (clusterServer) {
            let xValuesSave: { newValue: number, oldValue: number } | null = null;
            let yValuesSave: { newValue: number, oldValue: number } | null = null;

            const callListenerFn = (xValues: { newValue: number, oldValue: number } | null, yValues: { newValue: number, oldValue: number } | null) => {
                if (xValues !== null) {
                    xValuesSave = xValues
                }

                if (yValues !== null) {
                    yValuesSave = yValues
                }

                if (xValuesSave !== null && yValuesSave !== null) {
                    listener({x: xValuesSave.newValue, y: yValuesSave.newValue}, {x: xValuesSave.oldValue, y: yValuesSave.oldValue});
                }
            };

            const xListener = (newValue: number, oldValue: number) => {
                callListenerFn({newValue: newValue, oldValue: oldValue}, null);
            };

            const yListener = (newValue: number, oldValue: number) => {
                callListenerFn(null, {newValue: newValue, oldValue: oldValue});
            };

            clusterServer?.subscribeCurrentXAttribute(xListener);
            clusterServer?.subscribeCurrentYAttribute(yListener);
        }

    }

}

export class XyColorLightDevice extends XyColorBaseDevice {
    constructor(
        onOffAttributeInitialValues?: AttributeInitialValues<typeof OnOff.Cluster.attributes>,
        dimmableAttributeValues?: AttributeInitialValues<typeof LevelControl.Cluster.attributes>,
        xyColorAttributeValues?: Partial<AttributeInitialValues<XyColorControlCluster['attributes']>>,
        options: EndpointOptions = {},
    ) {
        const initialAttributeValues: { [key: ClusterId]: AttributeInitialValues<any> } = {};
        if (onOffAttributeInitialValues !== undefined) {
            initialAttributeValues[OnOff.Cluster.id] = onOffAttributeInitialValues;
        }
        if (dimmableAttributeValues !== undefined) {
            initialAttributeValues[LevelControl.Cluster.id] = dimmableAttributeValues;
        }
        if (xyColorAttributeValues !== undefined) {
            initialAttributeValues[ColorControl.Cluster.id] = xyColorAttributeValues;
        }
        super(DeviceTypes.EXTENDED_COLOR_LIGHT, initialAttributeValues, options);
    }

}

export type HueSaturationColorControlCluster = ColorControl.Extension<{ colorTemperature: true, hueSaturation: true }>;

export type HueSaturationColorDeviceCommands = {
    moveToHueAndSaturation: ClusterServerHandlers<HueSaturationColorControlCluster>["moveToHueAndSaturation"];
    moveToHue: ClusterServerHandlers<HueSaturationColorControlCluster>["moveToHue"];
    moveToSaturation: ClusterServerHandlers<HueSaturationColorControlCluster>["moveToSaturation"];
} & ColorTemperatureDeviceCommands;

export class HueSaturationColorBaseDevice extends extendPublicHandlerMethods<typeof ColorTemperatureBaseDevice, HueSaturationColorDeviceCommands>(ColorTemperatureBaseDevice) {

    protected override addDeviceClusters(
        attributeInitialValues?: { [key: ClusterId]: AttributeInitialValues<any> },
        excludeList: ClusterId[] = [],
    ) {
        super.addDeviceClusters(attributeInitialValues, [...excludeList, ColorControl.Cluster.id]);
        if (!excludeList.includes(ColorControl.Cluster.id)) {
            this.addClusterServer(
                createDefaultHueSaturationColorControlClusterServer(
                    this.commandHandler as any,
                    getClusterInitialAttributeValues(
                        attributeInitialValues,
                        ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature, ColorControl.Feature.HueSaturation),
                    ),
                ),
            );
        }
    }

    getCurrentHueSaturation(): { hue: number, saturation: number } | null {
        const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.HueSaturation));

        if (clusterServer) {
            return {
                hue: clusterServer.getCurrentHueAttribute(),
                saturation: clusterServer.getCurrentSaturationAttribute(),
            }
        }

        return null;
    }

    setCurrentHueSaturation(hueSaturation: { hue: number, saturation: number } | null) {
        const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.HueSaturation));

        if (clusterServer && hueSaturation) {
            clusterServer?.setCurrentHueAttribute(hueSaturation.hue);
            clusterServer?.setCurrentSaturationAttribute(hueSaturation.saturation);
        }
    }

    /**
     * Adds a listener for the CurrentLevel attribute
     *
     * @param listener Listener function to be called when the attribute changes
     */
    addCurrentHueSaturationListener(listener: (newValue: { hue: number, saturation: number } | null, oldValue: { hue: number, saturation: number } | null) => void) {
        const clusterServer = this.getClusterServer(ColorControl.Cluster.with(ColorControl.Feature.HueSaturation));

        if (clusterServer) {
            let hueValuesSave: { newValue: number, oldValue: number } | null = null;
            let saturationValuesSave: { newValue: number, oldValue: number } | null = null;

            const callListenerFn = (hueValues: { newValue: number, oldValue: number } | null, saturationValues: { newValue: number, oldValue: number } | null) => {
                if (hueValues !== null) {
                    hueValuesSave = hueValues
                }

                if (saturationValues !== null) {
                    saturationValuesSave = saturationValues
                }

                if (hueValuesSave !== null && saturationValuesSave !== null) {
                    listener({hue: hueValuesSave.newValue, saturation: saturationValuesSave.newValue}, {hue: hueValuesSave.oldValue, saturation: saturationValuesSave.oldValue});
                }
            };

            const hueListener = (newValue: number, oldValue: number) => {
                callListenerFn({newValue: newValue, oldValue: oldValue}, null);
            };

            const saturationListener = (newValue: number, oldValue: number) => {
                callListenerFn(null, {newValue: newValue, oldValue: oldValue});
            };

            clusterServer?.subscribeCurrentHueAttribute(hueListener);
            clusterServer?.subscribeCurrentSaturationAttribute(saturationListener);
        }

    }

}

export class HueSaturationColorLightDevice extends HueSaturationColorBaseDevice {
    constructor(
        onOffAttributeInitialValues?: AttributeInitialValues<typeof OnOff.Cluster.attributes>,
        dimmableAttributeValues?: AttributeInitialValues<typeof LevelControl.Cluster.attributes>,
        hueSaturationColorAttributeValues?: Partial<AttributeInitialValues<HueSaturationColorControlCluster['attributes']>>,
        options: EndpointOptions = {},
    ) {
        const initialAttributeValues: { [key: ClusterId]: AttributeInitialValues<any> } = {};
        if (onOffAttributeInitialValues !== undefined) {
            initialAttributeValues[OnOff.Cluster.id] = onOffAttributeInitialValues;
        }
        if (dimmableAttributeValues !== undefined) {
            initialAttributeValues[LevelControl.Cluster.id] = dimmableAttributeValues;
        }
        if (hueSaturationColorAttributeValues !== undefined) {
            initialAttributeValues[ColorControl.Cluster.id] = hueSaturationColorAttributeValues;
        }
        super(DeviceTypes.EXTENDED_COLOR_LIGHT, initialAttributeValues, options);
    }

}
