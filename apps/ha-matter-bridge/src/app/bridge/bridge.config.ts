import { ConfigService } from "@nestjs/config";

export interface BridgeConfig {
    passcode: number;
    discriminator: number;
    vendorid: number;
    productid: number;

    store: string;
    clearstorage: boolean;

    netinterface: string;
    port: number;
    uniqueid: number;

    // home assistant config
    hassUrl: string;
    hassAccessToken: string;
    addon?: boolean;
}
