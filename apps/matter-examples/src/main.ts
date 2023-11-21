import { ExampleApp } from "./examples/ExampleApp";
import { requireMinNodeVersion } from "@project-chip/matter-node.js/util";
import { Device } from "./examples/DeviceNode";
import { BridgedDevice } from "./examples/BridgedDevicesNode";

requireMinNodeVersion(16);

// get first arg as the example to run
const exampleName = process.argv[2] || /*'device'*/ 'bridge';
console.log(`Running example: ${exampleName}`);

// list al examples and types
console.log('Available examples:');
const examples: { name: string, constructor: () => ExampleApp }[] = [
  {  name: 'device', constructor: () => new Device() },
  {  name: 'bridge', constructor: () => new BridgedDevice() },
];

const example = examples.find(e => e.name === exampleName);

const app = example.constructor();
app
  .start()
  .then(() => {
    /* done */
  })
  .catch(err => console.error(err));

process.on("SIGINT", () => {
  // Clean up on CTRL-C
  app
    .stop()
    .then(() => {
      // Pragmatic way to make sure the storage is correctly closed before the process ends.
      process.exit(0);
    })
    .catch(err => console.error(err));
});
