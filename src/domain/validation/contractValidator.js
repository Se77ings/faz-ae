// Domain/Validation/Contract.js
export class ContractValidator {
  constructor() {
    this.isValid = true;
  }

  requires(value, message = "Campo obrigatório") {
    if (value === undefined || value === null || value === "") this.isValid = false;
    return this;
  }

  isString(value) {
    if (typeof value !== "string") this.isValid = false;
    return this;
  }

  isBoolean(value) {
    if (typeof value !== "boolean") this.isValid = false;
    return this;
  }

  isDate(value) {
    if (!(value instanceof Date) || isNaN(value.getTime())) this.isValid = false;
    return this;
  }

  isInteger(value) {
    if (!Number.isInteger(value)) this.isValid = false;
    return this;
  }

  hasMaxLen(value, max) {
    if (value && value.length > max) this.isValid = false;
    return this;
  }
}