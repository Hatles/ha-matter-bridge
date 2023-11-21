import { Module } from '@nestjs/common';
import { BridgeModule } from "./bridge/bridge.module";

@Module({
  imports: [
    BridgeModule
  ],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}
