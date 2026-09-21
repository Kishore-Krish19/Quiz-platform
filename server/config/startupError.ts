/**
 * A configuration problem the operator has to fix before the server may start — for
 * example a signing secret or admin password that has been published. server.ts prints
 * these as a plain instruction rather than a stack trace, then exits.
 */
export class StartupConfigError extends Error {
  constructor(
    message: string,
    public readonly help: string[] = []
  ) {
    super(message);
    this.name = 'StartupConfigError';
  }
}
