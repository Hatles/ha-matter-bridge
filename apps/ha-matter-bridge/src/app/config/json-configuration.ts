import { readFileSync } from 'fs';

export default (filePath: string) => () => {
    try {
        const fileContent = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
        const config = JSON.parse(fileContent) as Record<string, any>;
        return config;
    } catch (e) {
        // return () => ({} as Record<string, any>)
        console.error("Error loading config file at " + filePath, e)
        throw e;
    }
};
