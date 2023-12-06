# docker build --no-cache -t ha-matter-bridge-addon .
# docker run --rm -p 5540:5540/tcp -p 5540:5540/udp ha-matter-bridge-addon

ARG BUILD_FROM
FROM $BUILD_FROM

#ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base
#FROM ghcr.io/home-assistant/amd64-base

# install node and npm
ARG NODE_VERSION="18.18.2-r0"
ARG NPM_VERSION="9.6.6-r0"
RUN apk update && apk add nodejs="$NODE_VERSION" npm="$NPM_VERSION" icu-data-full

# log install packages versions
RUN node -v
RUN npm -v

# expose web interface port
EXPOSE 3000
# expose ports in both protocoles
EXPOSE 5540/tcp
EXPOSE 5540/udp

# Create app directory
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure copying both package.json AND package-lock.json (when available).
# Copying this first prevents re-running npm install on every code change.
COPY dist/package*.json ./
#COPY --chown=node:node dist/package*.json ./

# Install app dependencies using the `npm ci` command instead of `npm install`
RUN npm ci --only=production

# Copy the bundled code from the build stage to the production image
COPY dist/apps/ha-matter-bridge ./dist
#COPY --chown=node:node dist/apps/ha-matter-bridge ./dist

# Copy run script
COPY run.sh /
RUN chmod a+x /run.sh

#COPY dist/apps/ha-matter-bridge/assets /data

# Start the server using the production build
#CMD [ "node", "dist/main.js", "--store", "/data/.device-node" ]
#CMD ["sh", "-c", "node dist/main.js --config /data/options.json --store /data/.device-node --hassUrl http://supervisor --hassAccessToken $SUPERVISOR_TOKEN --addon true" ]
CMD [ "/run.sh" ]
