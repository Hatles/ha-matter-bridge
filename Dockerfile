# docker build -t ha-matter-bridge:0.0.1 -t ha-matter-bridge:latest .
# docker run -p 5540:5540/tcp -p 5540:5540/udp ha-matter-bridge

# docker build -t 192.168.1.92:5000/ha-matter-bridge:0.0.3 .
# docker push 192.168.1.92:5000/ha-matter-bridge:0.0.3

###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM node:18-alpine As development

# Create app directory
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure copying both package.json AND package-lock.json (when available).
# Copying this first prevents re-running npm install on every code change.
COPY --chown=node:node package*.json ./

# Install app dependencies using the `npm ci` command instead of `npm install`
RUN npm ci

# Bundle app source
COPY --chown=node:node . .

# Use the node user from the image (instead of the root user)
USER node

###################
# BUILD FOR PRODUCTION
###################

FROM node:18-alpine As build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

# In order to run `npm run build` we need access to the Nest CLI which is a dev dependency. In the previous development stage we ran `npm ci` which installed all dependencies, so we can copy over the node_modules directory from the development image
COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node . .

# Run the build command which creates the production bundle
# RUN npm run build
RUN npx nx run ha-matter-bridge:build:production

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Running `npm ci` removes the existing node_modules directory and passing in --only=production ensures that only the production dependencies are installed. This ensures that the node_modules directory is as optimized as possible
RUN npm ci --only=production && npm cache clean --force

USER node

###################
# PRODUCTION
###################

FROM node:18-alpine As production

# expose web interface port
EXPOSE 3000
# expose matter port
EXPOSE 5540/tcp
EXPOSE 5540/udp

WORKDIR /usr/src/app

# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist/apps/ha-matter-bridge ./dist

# todo remove and use log level addon options for log
ENV NODE_ENV development

# Start the server using the production build
CMD [ "node", "dist/main.js" ]
#CMD ["sh", "-c", "node dist/main.js --config /data/options.json --store /data/.device-node --hassUrl http://supervisor --hassAccessToken $SUPERVISOR_TOKEN --addon true" ]
