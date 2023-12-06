import { Controller, Get, Post, Redirect, Render } from '@nestjs/common';
import { BridgeService } from "./bridge.service";
import { DeviceManager } from "./device-manager.service";

@Controller('')
export class BridgeController {

    constructor(
        private bridge: BridgeService,
        private deviceManager: DeviceManager
    ) {
    }

    @Get()
    @Render('index')
    index() {
        const aggregator = this.bridge.getAggregator();
        const entities = this.deviceManager.getRegisteredEntities();

        return {
            title: 'HA Matter Bridge!',

            commissioned: this.bridge.isCommissioned(),
            qrCode: this.bridge.getQrCode(),
            qrPairingCode: this.bridge.getQrPairingCode(),
            qrCodeUrl: this.bridge.getQrCodeUrl(),
            manualPairingCode: this.bridge.getManualPairingCode(),

            devices: [
                {name: "Aggregator", type: aggregator.name, id: aggregator.id, serial: aggregator.determineUniqueID(), registered: true},
                ...entities.map(e => ({name: e.entity.entity_id, type: e.device?.name, id: e.device?.id, serial: e.device?.determineUniqueID(), registered: !!e.device})),
            ],
        };
    }

    @Redirect("/", 302)
    @Get('factory-reset')
    async factoryReset() {
        await this.bridge.factoryReset();
        return 'OK';
    }
}
