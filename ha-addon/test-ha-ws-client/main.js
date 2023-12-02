const {Auth, AuthData, createConnection, createLongLivedTokenAuth, SaveTokensFunc} = require("home-assistant-js-websocket");

Object.assign(global, { WebSocket: require('ws') })

const hassUrl = process.env.HASS_URL || 'http://192.168.1.45:8123';
const hassAccessToken = process.env.HASS_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI5NDkyNDkxY2ZlNGU0MTEwYmY5N2FiNWZiZjJlYTQ4ZiIsImlhdCI6MTY5OTcxNzcxMiwiZXhwIjoyMDE1MDc3NzEyfQ.mqzd29R9-2kcWHOdGSjKtEyWF8HtXu_vYG0voTKkBzk';
const addon = !!(process.env.ADDON && process.env.ADDON === 'true');

class AddonAuth extends Auth {
    wsPath = "";

    constructor(data, wsPath, saveTokens) {
        super(data, saveTokens);

        this.wsPath = wsPath;
    }

    get wsUrl() {
        return `ws${this.data.hassUrl.substr(4)}${this.wsPath}`;
    }
}

function createLongLivedTokenAddonAuth(hassUrl, wsPath, hassAccessToken) {
    return new AddonAuth({
        hassUrl,
        clientId: null,
        expires: Date.now() + 1e11,
        refresh_token: "",
        access_token: hassAccessToken,
        expires_in: 1e11,
    }, wsPath);

    // const auth = createLongLivedTokenAuth(hassUrl, hassAccessToken);
    //
    // const wsUrl = `ws${auth.data.hassUrl.substr(4)}${wsPath}`;
    // const defaultWsUrl = auth.wsUrl;
    // auth.wsUrl = `ws${auth.data.hassUrl.substr(4)}${wsPath}`;

    // return auth;

    // return {
    //     get data() {
    //         return auth.data;
    //     },
    //     set data(data) {
    //         auth.data = data;
    //     },
    //     get wsUrl() {
    //         // Convert from http:// -> ws://, https:// -> wss://
    //         return `ws${auth.data.hassUrl.substr(4)}${wsPath}`;
    //     },
    //     get accessToken() {
    //         return auth.accessToken;
    //     },
    //     get expired() {
    //         return auth.expired;
    //     },
    //     /**
    //      * Refresh the access token.
    //      */
    //     refreshAccessToken() {
    //         return auth.refreshAccessToken();
    //     },
    //     /**
    //      * Revoke the refresh & access tokens.
    //      */
    //     revoke() {
    //         return auth.revoke();
    //     },
    // };
}

let auth;

console.debug(`Connecting to ${hassUrl} with access token ${hassAccessToken}`);
try {
    // auth = createLongLivedTokenAuth(hassUrl, hassAccessToken);
    auth = createLongLivedTokenAddonAuth(hassUrl, addon ? '/core/websocket' : '/api/websocket', hassAccessToken);
} catch (err) {
    console.error(`Error while getting authentication token for HA websocket server: ${err}`);
    return;
}

try {
    createConnection({ auth: auth })
        .then(connection => {
            console.log(connection)
        })
        .catch((err) => {
            console.error(`Error while connecting to HA websocket server: ${err}`);
        })
    ;
} catch (err) {
    console.error(`Error while connecting to HA websocket server: ${err}`);
    return;
}
