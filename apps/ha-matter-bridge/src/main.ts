#!/usr/bin/env ts-node-script

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { BridgeService } from "./app/bridge/bridge.service";
import { LogLevel } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";

const LOG_LEVELS: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error'];

const DEFAULT_LEVEL: LogLevel = 'log';

async function bootstrap() {
    const development = process.env.NODE_ENV === 'development';

    const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? (development ? 'debug' : 'log');

    // log levels is set by slicing LOG_LEVELS
    let logLevelIndex = LOG_LEVELS.indexOf(logLevel) !== -1 ? LOG_LEVELS.indexOf(logLevel) : LOG_LEVELS.indexOf(DEFAULT_LEVEL);
    const logLevels: LogLevel[] = LOG_LEVELS.slice(logLevelIndex);

    // const app = await NestFactory.createApplicationContext(AppModule, {logger: logLevels});
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {logger: logLevels});

    const bridgeService = app.get(BridgeService);
    await bridgeService.start();

    app.useStaticAssets(join(__dirname, 'assets', 'public'));
    app.setBaseViewsDir(join(__dirname, 'assets', 'views'));
    app.setViewEngine('hbs');
    await app.listen(3000);
}

bootstrap();
