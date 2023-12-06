import { BeforeApplicationShutdown, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CommissioningServer, MatterServer } from "@project-chip/matter-node.js";

import { VendorId } from "@project-chip/matter-node.js/datatype";
import { Aggregator, DeviceTypes } from "@project-chip/matter-node.js/device";
import { QrCode } from "@project-chip/matter-node.js/schema";
import { StorageBackendDisk, StorageManager } from "@project-chip/matter-node.js/storage";
import { Time } from "@project-chip/matter-node.js/time";
import { HaService } from "./ha/ha.service";
import { DeviceManager } from "./device-manager.service";
import { BridgeConfig } from "./bridge.config";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class BridgeStorage implements BeforeApplicationShutdown {

    private readonly logger = new Logger(BridgeStorage.name);

    // storageLocation = getParameter("store") ?? ".device-node";
    // storage = new StorageBackendDisk(this.storageLocation, hasParameter("clearstorage"));

    readonly storageLocation: string;
    readonly storage: StorageBackendDisk;

    constructor(private config: ConfigService<BridgeConfig>) {
        this.storageLocation = this.config.get('store') || ".device-node";
        this.storage = new StorageBackendDisk(this.storageLocation, this.config.get('clearstorage') || false);

        this.logger.log(`Storage location: ${this.storageLocation} (Directory)`);
        this.logger.log('Use the parameter "--store NAME" to specify a different storage location, use --clearstorage to start with an empty storage.');
    }

    async beforeApplicationShutdown(signal?: string) {
        await this.stop();
    }

    async stop() {
        await this.storage.close();
    }
}

@Injectable()
export class BridgeService implements OnModuleInit, BeforeApplicationShutdown {

    private readonly logger = new Logger(BridgeService.name);

    private storage: BridgeStorage;

    private matterServer: MatterServer | undefined;
    private commissioningServer: CommissioningServer | undefined;
    private ha: HaService;
    private deviceManager: DeviceManager;
    private aggregator: Aggregator;

    constructor(private config: ConfigService<BridgeConfig>, storage: BridgeStorage, ha: HaService, deviceManager: DeviceManager) {
        this.storage = storage;
        this.ha = ha;
        this.deviceManager = deviceManager;
    }

    async onModuleInit() {
        this.logger.log(`The module has been initialized.`);
    }

    getAggregator() {
        return this.aggregator;
    }

    async start() {
        this.logger.log(`Start node-matter`);

        await this.ha.connect();

        /**
         * Initialize the storage system.
         *
         * The storage manager is then also used by the Matter server, so this code block in general is required,
         * but you can choose a different storage backend as long as it implements the required API.
         */

        const storageManager = new StorageManager(this.storage.storage);
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

        const deviceName = "HA Matter Bridge";
        const deviceType = DeviceTypes.AGGREGATOR.code;
        const vendorName = "matter-node.js";
        const passcode = this.config.get("passcode") ?? deviceStorage.get("passcode", 20202021);
        const discriminator = this.config.get("discriminator") ?? deviceStorage.get("discriminator", 3840);
        // product name / id and vendor id should match what is in the device certificate
        const vendorId = this.config.get("vendorid") ?? deviceStorage.get("vendorid", 0xfff1);
        const productName = `HA Matter Bridge`;
        // const productName = `node-matter OnOff-Bridge`;
        const productId = this.config.get("productid") ?? deviceStorage.get("productid", 0x8000);

        const netInterface = this.config.get("netinterface");
        const port = this.config.get("port") ?? 5540;

        const uniqueId = this.config.get("uniqueid") ?? deviceStorage.get("uniqueid", Time.nowMs());

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

        this.matterServer = new MatterServer(storageManager, {mdnsInterface: netInterface} as any);

        this.commissioningServer = new CommissioningServer({
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
                serialNumber: `hmb-${uniqueId}`,
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

        this.aggregator = this.getHaEntitiesAggregator(uniqueId);

        this.commissioningServer.addDevice(this.aggregator);

        this.matterServer.addCommissioningServer(this.commissioningServer);

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

        this.logger.log("Listening");
        if (!this.commissioningServer.isCommissioned()) {
            const pairingData = this.commissioningServer.getPairingCode();
            const {qrPairingCode, manualPairingCode} = pairingData;

            const qrCode = this.getQrCode();
            this.logger.log('QR Code: \r\n' + qrCode);
            this.logger.log(`QR Code URL: https://project-chip.github.io/connectedhomeip/qrcode.html?data=${qrPairingCode}`);
            this.logger.log(`Manual pairing code: ${manualPairingCode}`);
        } else {
            this.logger.log("Device is already commissioned. Waiting for controllers to connect ...");
        }
    }

    isCommissioned() {
        return this.commissioningServer?.isCommissioned();
    }

    factoryReset() {
        return this.commissioningServer.factoryReset();
    }

    getPairingCode() {
        return this.commissioningServer?.getPairingCode();
    }

    getManualPairingCode() {
        return this.getPairingCode().manualPairingCode;
    }

    getQrPairingCode() {
        return this.getPairingCode().qrPairingCode;
    }

    getQrCode(): string {
        return QrCode.get(this.getQrPairingCode());
    }

    getQrCodeUrl() {
        return `https://project-chip.github.io/connectedhomeip/qrcode.html?data=${this.getQrPairingCode()}`
    }

    async beforeApplicationShutdown(signal?: string) {
        await this.stop();
    }

    private async stop() {
        await this.matterServer?.close();
        await this.storage.stop();
    }

    private getHaEntitiesAggregator(uniqueId: number): Aggregator {
        return this.deviceManager.registerEntities(uniqueId);
    }
}
