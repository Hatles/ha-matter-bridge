export interface ExampleApp {
  start(): Promise<void>;
  stop(): Promise<void>;
}
