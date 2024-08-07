export enum AppErrors {
  NOT_FOUND,
  BAD_REQUEST,
}

export class AppError extends Error {
  public readonly code;

  constructor(message: string, code: AppErrors) {
    super(message);
    this.code = code;
  }
}
