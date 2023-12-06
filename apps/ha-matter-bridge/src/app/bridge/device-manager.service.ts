import { Inject, Injectable, Logger, Type } from "@nestjs/common";
import { Subject, takeUntil } from "rxjs";
import { HaService } from "./ha/ha.service";
import { HassEntity } from "home-assistant-js-websocket";
import { Aggregator, ComposedDevice, Device } from "@project-chip/matter-node.js/device";
import crypto from "crypto";
import { ENTITY_CONVERTERS, EntityConverter } from "./entity-converter";
import { ModuleRef } from "@nestjs/core";


function getHashFromEntityId(entity_id: string, length: number = 8): string {
  const hash = crypto.createHash('sha1', {});
  return hash.update(entity_id).digest('hex').slice(0, length);
}


@Injectable()
export class DeviceManager {

  private readonly logger = new Logger(DeviceManager.name);

  private registeredEntities: {entity: HassEntity, device?: Device | ComposedDevice, unregister?: Subject<void>}[];
  private aggregator: Aggregator;

  private readonly converterInstances: { type: Type<EntityConverter>, instance: EntityConverter }[];

  constructor(private ha: HaService, @Inject(ENTITY_CONVERTERS) private converters: Type<EntityConverter>[], private moduleRef: ModuleRef) {
    this.converterInstances = this.converters.map(converterType => ({
      type: converterType,
      instance: moduleRef.get(converterType)
    }));
  }

  registerEntities(uniqueId: number) {
    this.aggregator = new Aggregator();
    // this.aggregator.name = 'HA Bridge';

    // const numDevices = getIntParameter("num") || 2;
    // for (let i = 1; i <= numDevices; i++) {
    //   const onOffDevice =
    //     getParameter(`type${i}`) === "socket" ? new OnOffPluginUnitDevice() : new OnOffLightDevice();
    //
    //   onOffDevice.addOnOffListener(on => {
    //     // commandExecutor(on ? `on${i}` : `off${i}`)?.();
    //     this.logger.log(`OnOffDevice ${onOffDevice.name} with id: ${i} turned ${on ? "on" : "off"}`);
    //   });
    //   onOffDevice.addCommandHandler("identify", async ({ request: { identifyTime } }) =>
    //     this.logger.log(
    //       `Identify called for OnOffDevice ${onOffDevice.name} with id: ${i} and identifyTime: ${identifyTime}`,
    //     ),
    //   );
    //
    //   const name = `OnOff ${onOffDevice instanceof OnOffPluginUnitDevice ? "Socket" : "Light"} ${i}`;
    //   aggregator.addBridgedDevice(onOffDevice, {
    //     nodeLabel: name,
    //     productName: name,
    //     productLabel: name,
    //     serialNumber: `node-matter-${uniqueId}-${i}`,
    //     reachable: true,
    //   });
    // }


    this.logger.debug(`Subscribing to HA entities for devices registrations`);
    this.logger.debug(`Registering converters: ${this.converterInstances.map(c => c.type.name).join(", ")}`);

      // register entities
    this.registeredEntities = [];
    this.ha.entities.entitiesRegistered.subscribe(entities => {
      Object.values(entities).forEach(entity => {
        const entityRegistration = this.registeredEntities.find(e => e.entity.entity_id === entity.entity_id && e.device)

        // register not already registered entities
        if (!entityRegistration) {

          // register new entity
          const converter = this.converterInstances.find(c => c.instance.canConvert(entity));
          if (converter) {
            this.logger.debug(`Registering converter for entity ${entity.entity_id} with converter ${converter.type.name}`);

            try {
                const unregister = new Subject<void>();
                const device = converter.instance.convert(
                    entity,
                    this.ha,
                    this.logger,
                    this.ha.entities.getEntityChanges(entity.entity_id).pipe(takeUntil(unregister)),
                    unregister.asObservable()
                );
                this.registeredEntities.push({ entity: entity, device: device, unregister: unregister});

                const name = entity.attributes.friendly_name?.substring(0, 32) ?? entity.entity_id; // max 32 characters
                const hash = getHashFromEntityId(entity.entity_id, 12);
                const serial = `hmb-${uniqueId}-${hash}`; // max 32 characters
                const deviceData = {
                    nodeLabel: name,
                    productName: name,
                    productLabel: name,
                    serialNumber: serial,
                    reachable: true,
                };
                this.aggregator.addBridgedDevice(device, deviceData);
                this.logger.debug(`Registered entity ${entity.entity_id} with converter ${converter.type.name} and data: `, deviceData);
            } catch (err) {
              this.logger.error(`Error while registering converter for entity ${entity.entity_id} with converter ${converter.type.name}`, err);
            }
          } else {
            this.logger.debug(`No converter found for entity ${entity.entity_id}`);
            this.registeredEntities.push({ entity: entity, device: null, unregister: null});
          }
        }
      });
    });

    // unregister entities
    this.ha.entities.entitiesUnregistered.subscribe(entities => {
      Object.values(entities).forEach(entity => {
        const entityRegistration = this.registeredEntities.find(e => e.entity.entity_id === entity.entity_id && e.device)

        if (entityRegistration) {
          // this.registeredEntities = this.registeredEntities.filter(e => e.entity.entity_id !== entity.entity_id);
          this.logger.log(`Removing entity ${entity.entity_id}`);
          entityRegistration.unregister.next();
          entityRegistration.unregister.complete();

          entityRegistration.device = null;
          entityRegistration.unregister = null;
        }
      });
    });

    return this.aggregator;
  }

    getRegisteredEntities() {
        return this.registeredEntities;
    }
}
