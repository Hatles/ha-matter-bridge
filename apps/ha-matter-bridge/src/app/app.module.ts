import { Module } from '@nestjs/common';
import { BridgeService, BridgeStorage } from "./bridge/bridge.service";
import { HaService } from "./bridge/ha/ha.service";
import { DeviceManager } from "./bridge/device-manager.service";
import { registerEntityConverters } from "./bridge/entity-converter";
import { LightEntityConverter } from "./bridge/entity-converters/light.entity-converter";

@Module({
  imports: [],
  // controllers: [AppController],
  providers: [
    BridgeService,
    BridgeStorage,
    HaService,
    DeviceManager,

    ...registerEntityConverters(
      LightEntityConverter,
    )
  ],
})
export class AppModule {}
