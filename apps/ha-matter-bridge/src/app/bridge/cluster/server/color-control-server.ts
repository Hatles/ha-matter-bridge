import { WrapCommandHandler } from "@project-chip/matter-node.js/device";
import { AttributeInitialValues, ClusterServer, ClusterServerHandlers, ColorControl } from "@project-chip/matter-node.js/cluster";
import { NamedHandler } from "../../devices/NamedHandler";
import { NotImplementedError } from "@project-chip/matter-node.js/common";

export const ColorControlDefaultClusterHandler: () => ClusterServerHandlers<typeof ColorControl.Complete> = () => ({
  moveToColorTemperature: async ({ request, attributes: { colorTemperatureMireds } }) => {
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

export const createDefaultColorControlClusterServer = (
  commandHandler: NamedHandler<any>,
  attributeInitialValues?: AttributeInitialValues<typeof ColorControl.Cluster.attributes>,
) =>
  ClusterServer(
    ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature),
    attributeInitialValues ?? {
      colorTemperatureMireds: 150,
      colorTempPhysicalMaxMireds: 500,
      colorTempPhysicalMinMireds: 100,
    } as any,
    WrapCommandHandler(ColorControlDefaultClusterHandler(), commandHandler as any) as any,
  );
