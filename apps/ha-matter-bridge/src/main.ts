/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { BridgeService } from "./app/bridge/bridge.service";
import { LogLevel } from "@nestjs/common";

async function bootstrap() {
  const logLevels: LogLevel[] = process.env.NODE_ENV === 'development' ? ['verbose', 'debug', 'log', 'warn', 'error'] : ['log', 'warn', 'error'];

  const app = await NestFactory.createApplicationContext(AppModule, { logger: logLevels });
  const bridgeService = app.get(BridgeService);
  await bridgeService.start()
}

bootstrap();
