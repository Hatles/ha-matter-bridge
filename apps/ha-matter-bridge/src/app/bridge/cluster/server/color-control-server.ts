import { WrapCommandHandler } from "@project-chip/matter-node.js/device";
import { AttributeInitialValues, ClusterServer, ClusterServerHandlers, ColorControl } from "@project-chip/matter-node.js/cluster";
import { NamedHandler } from "../../devices/NamedHandler";
import { NotImplementedError } from "@project-chip/matter-node.js/common";

export type TemperatureColorControlCluster = ColorControl.Extension<{colorTemperature: true}>;

export const ColorTemperatureControlDefaultClusterHandler: () => ClusterServerHandlers<TemperatureColorControlCluster> = () => ({
  moveToColorTemperature: async ({ request, attributes: { colorMode, colorTemperatureMireds } }) => {
    const currentColorMode = colorMode.getLocal();
    colorMode.setLocal(ColorControl.ColorMode.ColorTemperatureMireds);

    colorTemperatureMireds.setLocal(request.colorTemperatureMireds);
  },
  moveColorTemperature: async () => {
    throw new NotImplementedError("Not implemented");
  },
  stepColorTemperature: async () => {
    throw new NotImplementedError("Not implemented");
  },

  stopMoveStep: async () => {
    throw new NotImplementedError("Not implemented");
  },
});

export const createDefaultColorTemperatureControlClusterServer = (
  commandHandler: NamedHandler<any>,
  attributeInitialValues?: AttributeInitialValues<TemperatureColorControlCluster['attributes']>,
) =>
  ClusterServer(
    ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature),
    attributeInitialValues ?? {
      colorTemperatureMireds: 250,
      colorTempPhysicalMinMireds: 0,
      colorTempPhysicalMaxMireds: 65279,

      colorMode: ColorControl.ColorMode.ColorTemperatureMireds,
      options: {executeIfOff: false},

      numberOfPrimaries: null,
      primary4X: 0,
      primary4Y: 0,
      primary4Intensity: null,
      primary5X: 0,
      primary5Y: 0,
      primary5Intensity: null,
      primary6X: 0,
      primary6Y: 0,
      primary6Intensity: null,
      enhancedColorMode: ColorControl.EnhancedColorMode.ColorTemperatureMireds,
      colorCapabilities: {
        ct: true,
        ehue: false,
        xy: false,
        hs: false,
        cl: false
      }
    },
    WrapCommandHandler(ColorTemperatureControlDefaultClusterHandler(), commandHandler as any),
  );

export type XyColorControlCluster = ColorControl.Extension<{colorTemperature: true, xy: true}>;

export const XyColorControlDefaultClusterHandler: () => ClusterServerHandlers<XyColorControlCluster> = () => ({
  moveToColor: async ({ request: { colorX, colorY }, attributes: { colorMode, currentX, currentY } }) => {
    const currentColorMode = colorMode.getLocal();
    colorMode.setLocal(ColorControl.ColorMode.CurrentXAndCurrentY)

    currentX.setLocal(colorX);
    currentY.setLocal(colorY);
  },
  moveColor: async () => {
    throw new NotImplementedError("Not implemented");
  },
  stepColor: async () => {
    throw new NotImplementedError("Not implemented");
  },

  ...ColorTemperatureControlDefaultClusterHandler(),

  // moveToColorTemperature: async ({ request, attributes: { colorTemperatureMireds } }) => {
  //   colorTemperatureMireds.setLocal(request.colorTemperatureMireds);
  // },
  // moveColorTemperature: async () => {
  //   throw new NotImplementedError("Not implemented");
  // },
  // stepColorTemperature: async () => {
  //   throw new NotImplementedError("Not implemented");
  // },
  //
  // stopMoveStep: async () => {
  //   throw new NotImplementedError("Not implemented");
  // },
});

export const createDefaultXyColorControlClusterServer = (
  commandHandler: NamedHandler<any>,
  attributeInitialValues?: Partial<AttributeInitialValues<XyColorControlCluster['attributes']>>,
) =>
  ClusterServer(
    ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature, ColorControl.Feature.Xy),
    {
      currentX: 0,
      currentY: 0,

      colorTemperatureMireds: 250,
      colorTempPhysicalMinMireds: 0,
      colorTempPhysicalMaxMireds: 65279,

      colorMode: ColorControl.ColorMode.CurrentXAndCurrentY,
      options: {executeIfOff: false},

      numberOfPrimaries: null,
      primary4X: 0,
      primary4Y: 0,
      primary4Intensity: null,
      primary5X: 0,
      primary5Y: 0,
      primary5Intensity: null,
      primary6X: 0,
      primary6Y: 0,
      primary6Intensity: null,
      enhancedColorMode: ColorControl.EnhancedColorMode.CurrentXAndCurrentY,
      colorCapabilities: {
        ct: false,
        ehue: false,
        xy: true,
        hs: false,
        cl: false
      },

      ...attributeInitialValues
    },
    WrapCommandHandler(XyColorControlDefaultClusterHandler(), commandHandler as any),
  );

export type HueSaturationColorControlCluster = ColorControl.Extension<{colorTemperature: true, hueSaturation: true}>;

export const HueSaturationColorControlDefaultClusterHandler: () => ClusterServerHandlers<HueSaturationColorControlCluster> = () => ({
    moveToHueAndSaturation: async ({ request: { hue, saturation }, attributes: { currentHue, currentSaturation, colorMode } }) => {
        const currentColorMode = colorMode.getLocal();
        colorMode.setLocal(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);

        currentHue.setLocal(hue);
        currentSaturation.setLocal(saturation);

    },
    moveToHue: async ({ request: { hue }, attributes: { currentHue } }) => {
        currentHue.setLocal(hue);
    },
    moveToSaturation: async ({ request: { saturation }, attributes: { currentSaturation } }) => {
        currentSaturation.setLocal(saturation);
    },
    moveHue: async () => {
        throw new NotImplementedError("Not implemented");
    },
    moveSaturation: async () => {
        throw new NotImplementedError("Not implemented");
    },
    stepHue: async () => {
        throw new NotImplementedError("Not implemented");
    },
    stepSaturation: async () => {
        throw new NotImplementedError("Not implemented");
    },

  ...ColorTemperatureControlDefaultClusterHandler(),
});

export const createDefaultHueSaturationColorControlClusterServer = (
  commandHandler: NamedHandler<any>,
  attributeInitialValues?: Partial<AttributeInitialValues<HueSaturationColorControlCluster['attributes']>>,
) =>
  ClusterServer(
    ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature, ColorControl.Feature.HueSaturation),
    {
      currentHue: 0,
      currentSaturation: 0,

      colorTemperatureMireds: 250,
      colorTempPhysicalMinMireds: 0,
      colorTempPhysicalMaxMireds: 65279,

      colorMode: ColorControl.ColorMode.CurrentHueAndCurrentSaturation,
      options: {executeIfOff: false},

      numberOfPrimaries: null,
      primary4X: 0,
      primary4Y: 0,
      primary4Intensity: null,
      primary5X: 0,
      primary5Y: 0,
      primary5Intensity: null,
      primary6X: 0,
      primary6Y: 0,
      primary6Intensity: null,
      enhancedColorMode: ColorControl.EnhancedColorMode.CurrentHueAndCurrentSaturation,
      colorCapabilities: {
        ct: false,
        ehue: false,
        xy: false,
        hs: true,
        cl: false
      },

      ...attributeInitialValues
    },
    WrapCommandHandler(HueSaturationColorControlDefaultClusterHandler(), commandHandler as any),
  );
