
export function getParameter<T = string>(parameter: string, defaultValue: T = null): T {
  return defaultValue;
}

export function getIntParameter(parameter: string): number {
  return getParameter(parameter, null);
}
