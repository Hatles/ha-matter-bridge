import { Module } from '@nestjs/common';
import { BridgeModule } from "./bridge/bridge.module";
import jsonConfiguration from "./config/json-configuration";
import { ConfigModule } from "@nestjs/config";
import argsConfiguration from "./config/args-configuration";
import { getParameter } from "./config/utils";
import { join } from "path";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [
                argsConfiguration,
                jsonConfiguration(getParameter('config', join( __dirname, 'assets/options.json')))
            ],
        }),
        BridgeModule,
    ],
    // controllers: [AppController],
    // providers: [AppService],
})
export class AppModule {
}
