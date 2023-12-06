#!/usr/bin/env bash

# clean addon dist folder
rm -rf ha-addon/matter-bridge/dist/*

# copy package.json and lock to matter-bridge addon dist folder
cp package.json ha-addon/matter-bridge/dist
cp package-lock.json ha-addon/matter-bridge/dist

# copy built apps from dist to addon dist folder
cp -r dist ha-addon/matter-bridge
