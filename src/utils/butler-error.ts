export class ButlerError extends Error {
  constructor(public command: string, message: string, public details?: any) {
    super(message);
  }
}
