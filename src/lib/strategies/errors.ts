export class ConflictError extends Error {
  constructor(public detail = "overlap detected") {
    super(detail);
  }
}
