const commandArguments = process.argv.slice(2);

export function getParameter(parameter: string, defaultValue: string = undefined): string {
    const markerIndex = commandArguments.indexOf(`--${parameter}`);
    if (markerIndex === -1 || markerIndex + 1 === commandArguments.length) return defaultValue;
    return commandArguments[markerIndex + 1] as any;
}

export function getParameters(): Record<string, any> {
    const args = {} as Record<string, any>;

    commandArguments.forEach((baseArg, index) => {
        if (baseArg.startsWith('--')) {
            const arg = getArgument(baseArg)
            // argument as --arg=value
            if (arg.indexOf('=') !== -1) {
                if (arg.indexOf('=') > 0 && arg.indexOf('=') < arg.length - 1) {
                    const [key, value] = arg.split('=');
                    args[key] = value;
                }
            }

            // next argument is the value for this argument
            if (index + 1 < commandArguments.length) {
                // if next argument is not a parameter, it is the value for this argument. Otherwise, it is another parameter.
                if (!commandArguments[index + 1].startsWith('--')) {
                    args[arg] = commandArguments[index + 1];
                } else {
                    args[arg] = true;
                }
            }
        }
    });

    return args;
}

function getArgument(param: string) {
    // remove -- at begining
    return param.replace(/^--/, '');
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
