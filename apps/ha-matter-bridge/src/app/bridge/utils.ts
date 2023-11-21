const commandArguments = process.argv.slice(2);

export function getParameter(parameter: string, defaultValue: string = undefined): string {
    const markerIndex = commandArguments.indexOf(`--${parameter}`);
    if (markerIndex === -1 || markerIndex + 1 === commandArguments.length) return defaultValue;
    return commandArguments[markerIndex + 1] as any;
}

export function getIntParameter(parameter: string, defaultValue: number = undefined) {
    const value = getParameter(parameter, defaultValue === undefined ? undefined : '' + defaultValue);
    if (value === undefined) return undefined;
    const intValue = parseInt(value, 10);
    if (isNaN(intValue)) throw new Error(`Invalid value for parameter ${parameter}: ${value} is not a number`);
    return intValue;
}

export function getBoolParameter(parameter: string, defaultValue: boolean = false): boolean {
    const value = getParameter(parameter, defaultValue ? 'true' : 'false');
    if (value === undefined) return undefined;
    if (value !== 'true' && value !== 'false') throw new Error(`Invalid value for parameter ${parameter}: ${value} is not a boolean (true or false)`);
    const boolValue = value === 'true';
    return boolValue;
}
