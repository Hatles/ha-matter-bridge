"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("@project-chip/matter-node.js/util");
var DeviceNode_1 = require("./examples/DeviceNode");
var BridgedDevicesNode_1 = require("./examples/BridgedDevicesNode");
(0, util_1.requireMinNodeVersion)(16);
// get first arg as the example to run
var exampleName = process.argv[2] || 'device';
console.log("Running example: ".concat(exampleName));
// list al examples and types
console.log('Available examples:');
var examples = [
    { name: 'device', constructor: function () { return new DeviceNode_1.Device(); } },
    { name: 'bridge', constructor: function () { return new BridgedDevicesNode_1.BridgedDevice(); } },
];
var example = examples.find(function (e) { return e.name === exampleName; });
var app = example.constructor();
app
    .start()
    .then(function () {
    /* done */
})
    .catch(function (err) { return console.error(err); });
process.on("SIGINT", function () {
    // Clean up on CTRL-C
    app
        .stop()
        .then(function () {
        // Pragmatic way to make sure the storage is correctly closed before the process ends.
        process.exit(0);
    })
        .catch(function (err) { return console.error(err); });
});
