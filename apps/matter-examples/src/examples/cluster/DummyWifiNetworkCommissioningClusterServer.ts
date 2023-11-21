/**
 * @license
 * Copyright 2022 The node-matter Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    ClusterServer,
    ClusterServerObjForCluster,
    GeneralCommissioningCluster,
    NetworkCommissioning,
} from "@project-chip/matter-node.js/cluster";
import { ByteArray, getParameter } from "@project-chip/matter-node.js/util";

const firstNetworkId = new ByteArray(32);

const WifiNetworkCluster = NetworkCommissioning.Cluster.with(NetworkCommissioning.Feature.WiFiNetworkInterface);

/**
 * This represents a Dummy version of a Wifi Network Commissioning Cluster Server without real Wifi related logic, beside
 * returning some values provided as CLI parameters. This dummy implementation is only there for tests/as showcase for BLE
 * commissioning of a device.
 */
export default ClusterServer(
    NetworkCommissioning.Cluster.with(NetworkCommissioning.Feature.WiFiNetworkInterface),
    {
        maxNetworks: 1,
        interfaceEnabled: true,
        lastConnectErrorValue: 0,
        lastNetworkId: null,
        lastNetworkingStatus: null,
        networks: [{ networkId: firstNetworkId, connected: false }],
        scanMaxTimeSeconds: 3,
        connectMaxTimeSeconds: 3,
    },
    {
        scanNetworks: async ({ request: { ssid, breadcrumb }, attributes: { lastNetworkingStatus }, endpoint }) => {
            console.log(`---> scanNetworks called on NetworkCommissioning cluster: ${ssid?.toHex()} ${breadcrumb}`);

            // Simulate successful scan
            if (breadcrumb !== undefined) {
                const generalCommissioningCluster = endpoint.getClusterServer(GeneralCommissioningCluster as any);
                generalCommissioningCluster?.setBreadcrumbAttribute(breadcrumb);
            }

            const networkingStatus = NetworkCommissioning.NetworkCommissioningStatus.Success;
            lastNetworkingStatus?.setLocal(networkingStatus);

            return {
                networkingStatus,
                wiFiScanResults: [
                    {
                        security: {
                            unencrypted: false,
                            wep: false,
                            wpaPersonal: false,
                            wpa2Personal: true,
                            wpa3Personal: true,
                        },
                        ssid: ssid || ByteArray.fromString(getParameter("ble-wifi-scan-ssid") ?? "TestSSID"), // Set a valid existing local Wi-Fi SSID here
                        bssid: ByteArray.fromString(getParameter("ble-wifi-scan-bssid") ?? "00:00:00:00:00:00"),
                        channel: 1,
                    },
                ],
            };
        },
        addOrUpdateWiFiNetwork: async ({
            request: { ssid, credentials, breadcrumb },
            attributes: { lastNetworkingStatus, lastNetworkId },
            endpoint,
            session,
        }) => {
            console.log(
                `---> addOrUpdateWiFiNetwork called on NetworkCommissioning cluster: ${ssid.toHex()} ${credentials.toHex()} ${breadcrumb}`,
            );

            session.getContext().assertFailSafeArmed("Failsafe timer needs to be armed to add or update networks.");

            // Simulate successful add or update
            if (breadcrumb !== undefined) {
                const generalCommissioningCluster = endpoint.getClusterServer(GeneralCommissioningCluster as any);
                generalCommissioningCluster?.setBreadcrumbAttribute(breadcrumb);
            }

            const networkingStatus = NetworkCommissioning.NetworkCommissioningStatus.Success;
            lastNetworkingStatus?.setLocal(networkingStatus);
            lastNetworkId?.setLocal(firstNetworkId);

            return {
                networkingStatus: NetworkCommissioning.NetworkCommissioningStatus.Success,
                networkIndex: 0,
            };
        },
        removeNetwork: async ({
            request: { networkId, breadcrumb },
            attributes: { lastNetworkingStatus, lastNetworkId },
            endpoint,
            session,
        }) => {
            console.log(
                `---> removeNetwork called on NetworkCommissioning cluster: ${networkId.toHex()} ${breadcrumb}`,
            );

            session.getContext().assertFailSafeArmed("Failsafe timer needs to be armed to add or update networks.");

            // Simulate successful add or update
            if (breadcrumb !== undefined) {
                const generalCommissioningCluster = endpoint.getClusterServer(GeneralCommissioningCluster as any);
                generalCommissioningCluster?.setBreadcrumbAttribute(breadcrumb);
            }

            const networkingStatus = NetworkCommissioning.NetworkCommissioningStatus.Success;
            lastNetworkingStatus?.setLocal(networkingStatus);
            lastNetworkId?.setLocal(firstNetworkId);

            return {
                networkingStatus: NetworkCommissioning.NetworkCommissioningStatus.Success,
                networkIndex: 0,
            };
        },
        connectNetwork: async ({
            request: { networkId, breadcrumb },
            attributes: { lastNetworkingStatus, lastNetworkId, lastConnectErrorValue, networks },
            endpoint,
            session,
        }) => {
            console.log(
                `---> connectNetwork called on NetworkCommissioning cluster: ${networkId.toHex()} ${breadcrumb}`,
            );

            session.getContext().assertFailSafeArmed("Failsafe timer needs to be armed to add or update networks.");

            // Simulate successful connection
            if (breadcrumb !== undefined) {
                const generalCommissioningCluster = endpoint.getClusterServer(GeneralCommissioningCluster as any);
                generalCommissioningCluster?.setBreadcrumbAttribute(breadcrumb);
            }

            const networkList = networks.getLocal();
            networkList[0].connected = true;
            networks.setLocal(networkList);

            const networkingStatus = NetworkCommissioning.NetworkCommissioningStatus.Success;
            lastNetworkingStatus?.setLocal(networkingStatus);
            lastNetworkId?.setLocal(firstNetworkId);
            lastConnectErrorValue?.setLocal(null);

            // Announce operational in IP network
            const device = session.getContext();
            await device.startAnnouncement();

            return {
                networkingStatus: NetworkCommissioning.NetworkCommissioningStatus.Success,
                errorValue: null,
            };
        },
        reorderNetwork: async ({
            request: { networkId, networkIndex, breadcrumb },
            attributes: { lastNetworkingStatus },
            endpoint,
        }) => {
            console.log(
                `---> reorderNetwork called on NetworkCommissioning cluster: ${networkId.toHex()} ${networkIndex} ${breadcrumb}`,
            );

            // Simulate successful connection
            if (breadcrumb !== undefined) {
                const generalCommissioningCluster = endpoint.getClusterServer(GeneralCommissioningCluster as any);
                generalCommissioningCluster?.setBreadcrumbAttribute(breadcrumb);
            }

            const networkingStatus = NetworkCommissioning.NetworkCommissioningStatus.Success;
            lastNetworkingStatus?.setLocal(networkingStatus);

            return {
                networkingStatus: NetworkCommissioning.NetworkCommissioningStatus.Success,
                networkIndex: 0,
            };
        },
    },
) as ClusterServerObjForCluster<typeof WifiNetworkCluster>;
