import { Logger } from "@nestjs/common";

export class DeviceUpdater {

  private _internal = false;

  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  internal(updateFn: () => void) {
    this._internal = true;

    try {
      updateFn();
    } catch (e) {
      this.logger.error(e);
    }

    this._internal = false;
  }

  external(updateFn: () => void | Promise<void>) {
    if (!this._internal) {
      const result = updateFn();

      if (result instanceof Promise) {
          result.catch(e => this.logger.error(e))
      }
    }
  }
}
