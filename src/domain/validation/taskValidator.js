import { ContractValidator } from "./contractValidator.js";

export class TaskValidator {
    
    constructor() {
        throw new Error("TaskValidator é uma classe estática e não pode ser instanciada.");
    }

    static validateMainTask(description, observation, priority, dueDate, notify) {
        const contract = new ContractValidator()
            .requires(description)
            .isString(description)
            .hasMaxLen(description, 100)
            .isString(observation)
            .hasMaxLen(observation, 500)
            .requires(priority)
            .isInteger(priority)
            .requires(dueDate)
            .isDate(dueDate)
            .isBoolean(notify);

        return contract.isValid;
    }

    static validateSubTask(description) {
        const contract = new ContractValidator()
            .requires(description)
            .isString(description)
            .hasMaxLen(description, 100);
            
        return contract.isValid;
    }
}