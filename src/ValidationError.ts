import {IOutputError} from "better-ajv-errors";

export class ValidationError extends Error {
    constructor(public validationErrors: IOutputError[]) {
        super("Validation error");
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
