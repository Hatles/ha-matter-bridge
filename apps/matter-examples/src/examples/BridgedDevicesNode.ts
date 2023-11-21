#!/usr/bin/env node
/**
 * @license
 * Copyright 2022 The node-matter Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This example shows how to create a device bridge that exposed multiple devices.
 * It can be used as CLI script and starting point for your own device node implementation.
 */

/**
 * Import needed modules from @project-chip/matter-node.js
 */
// Include this first to auto-register Crypto, Network and Time Node.js implementations
import { CommissioningServer, MatterServer } from "@project-chip/matter-node.js";

import { VendorId } from "@project-chip/matter-node.js/datatype";
import { Aggregator, DeviceTypes, OnOffLightDevice, OnOffPluginUnitDevice } from "@project-chip/matter-node.js/device";
import { Format, Level, Logger } from "@project-chip/matter-node.js/log";
import { QrCode } from "@project-chip/matter-node.js/schema";
import { StorageBackendDisk, StorageManager } from "@project-chip/matter-node.js/storage";
import { Time } from "@project-chip/matter-node.js/time";
import {
    commandExecutor,
    getIntParameter,
    getParameter,
    hasParameter,
    requireMinNodeVersion,
} from "@project-chip/matter-node.js/util";

export class BridgedDevice {
    private matterServer: MatterServer | undefined;
    private logger = Logger.get("Device");
    private storage: StorageBackendDisk;

    private initParameters() {
        const logger = Logger.get("Device");

        /** Configure logging */
        switch (getParameter("loglevel")) {
            case "fatal":
                Logger.defaultLogLevel = Level.FATAL;
                break;
            case "error":
                Logger.defaultLogLevel = Level.ERROR;
                break;
            case "warn":
                Logger.defaultLogLevel = Level.WARN;
                break;
            case "info":
                Logger.defaultLogLevel = Level.INFO;
                break;
        }

        switch (getParameter("logformat")) {
            case "plain":
                Logger.format = Format.PLAIN;
                break;
            case "html":
                Logger.format = Format.HTML;
                break;
            default:
                if (process.stdin?.isTTY) Logger.format = Format.ANSI;
        }

        const storageLocation = getParameter("store") ?? ".device-node";
        this.storage = new StorageBackendDisk(storageLocation, hasParameter("clearstorage"));
        logger.info(`Storage location: ${storageLocation} (Directory)`);
        logger.info(
            'Use the parameter "-store NAME" to specify a different storage location, use -clearstorage to start with an empty storage.',
        );

    }

    async start() {
        this.logger.info(`node-matter bridge`);

        this.initParameters();

        /**
         * Initialize the storage system.
         *
         * The storage manager is then also used by the Matter server, so this code block in general is required,
         * but you can choose a different storage backend as long as it implements the required API.
         */

        const storageManager = new StorageManager(this.storage);
        await storageManager.initialize();

        /**
         * Collect all needed data
         *
         * This block makes sure to collect all needed data from cli or storage. Replace this with where ever your data
         * come from.
         *
         * Note: This example also uses the initialized storage system to store the device parameter data for convenience
         * and easy reuse. When you also do that be careful to not overlap with Matter-Server own contexts
         * (so maybe better not ;-)).
         */

        const deviceStorage = storageManager.createContext("Device");

        const deviceName = "Matter Bridge device";
        const deviceType = DeviceTypes.AGGREGATOR.code;
        const vendorName = "matter-node.js";
        const passcode = getIntParameter("passcode") ?? deviceStorage.get("passcode", 20202021);
        const discriminator = getIntParameter("discriminator") ?? deviceStorage.get("discriminator", 3840);
        // product name / id and vendor id should match what is in the device certificate
        const vendorId = getIntParameter("vendorid") ?? deviceStorage.get("vendorid", 0xfff1);
        const productName = `node-matter OnOff-Bridge`;
        const productId = getIntParameter("productid") ?? deviceStorage.get("productid", 0x8000);

        const netInterface = getParameter("netinterface");
        const port = getIntParameter("port") ?? 5540;

        const uniqueId = getIntParameter("uniqueid") ?? deviceStorage.get("uniqueid", Time.nowMs());

        deviceStorage.set("passcode", passcode);
        deviceStorage.set("discriminator", discriminator);
        deviceStorage.set("vendorid", vendorId);
        deviceStorage.set("productid", productId);
        deviceStorage.set("uniqueid", uniqueId);

        /**
         * Create Matter Server and CommissioningServer Node
         *
         * To allow the device to be announced, found, paired and operated we need a MatterServer instance and add a
         * commissioningServer to it and add the just created device instance to it.
         * The CommissioningServer node defines the port where the server listens for the UDP packages of the Matter protocol
         * and initializes deice specific certificates and such.
         *
         * The below logic also adds command handlers for commands of clusters that normally are handled internally
         * like testEventTrigger (General Diagnostic Cluster) that can be implemented with the logic when these commands
         * are called.
         */

        this.matterServer = new MatterServer(storageManager, { mdnsAnnounceInterface: netInterface  });

        const commissioningServer = new CommissioningServer({
            port,
            deviceName,
            deviceType,
            passcode,
            discriminator,
            basicInformation: {
                vendorName,
                vendorId: VendorId(vendorId),
                nodeLabel: productName,
                productName,
                productLabel: productName,
                productId,
                serialNumber: `node-matter-${uniqueId}`,
            },
        });

        /**
         * Create Device instance and add needed Listener
         *
         * Create an instance of the matter device class you want to use.
         * This example uses the OnOffLightDevice or OnOffPluginUnitDevice depending on the value of the type  parameter.
         * To execute the on/off scripts defined as parameters a listener for the onOff attribute is registered via the
         * device specific API.
         *
         * The below logic also adds command handlers for commands of clusters that normally are handled device internally
         * like identify that can be implemented with the logic when these commands are called.
         */

        const aggregator = new Aggregator();

        const numDevices = getIntParameter("num") || 2;
        for (let i = 1; i <= numDevices; i++) {
            const onOffDevice =
                getParameter(`type${i}`) === "socket" ? new OnOffPluginUnitDevice() : new OnOffLightDevice();

            onOffDevice.addOnOffListener(on => commandExecutor(on ? `on${i}` : `off${i}`)?.());
            onOffDevice.addCommandHandler("identify", async ({ request: { identifyTime } }) =>
                console.log(
                    `Identify called for OnOffDevice ${onOffDevice.name} with id: ${i} and identifyTime: ${identifyTime}`,
                ),
            );

            const name = `OnOff ${onOffDevice instanceof OnOffPluginUnitDevice ? "Socket" : "Light"} ${i}`;
            aggregator.addBridgedDevice(onOffDevice, {
                nodeLabel: name,
                productName: name,
                productLabel: name,
                serialNumber: `node-matter-${uniqueId}-${i}`,
                reachable: true,
            });
        }

        commissioningServer.addDevice(aggregator);

        await this.matterServer.addCommissioningServer(commissioningServer);

        /**
         * Start the Matter Server
         *
         * After everything was plugged together we can start the server. When not delayed announcement is set for the
         * CommissioningServer node then this command also starts the announcement of the device into the network.
         */

        await this.matterServer.start();

        /**
         * Print Pairing Information
         *
         * If the device is not already commissioned (this info is stored in the storage system) then get and print the
         * pairing details. This includes the QR code that can be scanned by the Matter app to pair the device.
         */

        this.logger.info("Listening");
        if (!commissioningServer.isCommissioned()) {
            const pairingData = commissioningServer.getPairingCode();
            const { qrPairingCode, manualPairingCode } = pairingData;

            console.log(QrCode.get(qrPairingCode));
            console.log(
                `QR Code URL: https://project-chip.github.io/connectedhomeip/qrcode.html?data=${qrPairingCode}`,
            );
            console.log(`Manual pairing code: ${manualPairingCode}`);
        } else {
            console.log("Device is already commissioned. Waiting for controllers to connect ...");
        }
    }

    async stop() {
        await this.matterServer?.close();
    }
}
