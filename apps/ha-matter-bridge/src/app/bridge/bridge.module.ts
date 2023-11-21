import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { BridgeService, BridgeStorage } from "./bridge.service";
import { HaService } from "./ha/ha.service";
import { DeviceManager } from "./device-manager.service";
import { registerEntityConverters } from "./entity-converter";
import { LightEntityConverter } from "./entity-converters/light.entity-converter";
import { Logger as MatterLogger, Level } from '@project-chip/matter-node.js/log';

@Module({
  imports: [],
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
export class BridgeModule implements OnModuleInit {

  onModuleInit(): any {

    // configure matter logger
    const logger = new Logger("matter.js");

    MatterLogger.log = (level: Level, formattedLog: string) => {
      switch (level) {
        case Level.DEBUG:
          logger.debug(formattedLog);
          break;
        case Level.INFO:
          logger.log(formattedLog);
          break;
        case Level.WARN:
          logger.warn(formattedLog);
          break;
        case Level.ERROR:
          logger.error(formattedLog);
          break;
        case Level.FATAL:
          logger.fatal(formattedLog);
          break;
      }
    };

  }

}
