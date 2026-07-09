import { taskStatus } from "../enumerations/taskStatus.js";
import { ContractValidator } from "../validation/contractValidator.js";

export default class TaskAggregate {
    #_subTasks = [];
    status;
    progressPercentage;
    subTasks = this.#_subTasks;

    constructor(description, observation, priority, dueDate, notify) {

        if (!validateContract()) {
            throw new Error("Falha na validação de domínio: Dados inválidos para TaskAggregate.");
        }

        this.id = new Guid();
        this.description = description;
        this.observation = observation;
        this.priority = priority;
        this.dueDate = dueDate;
        this.createdDate = new Date();
        this.notify = notify;
        this.status = taskStatus.Todo;
    }

    completeTask() {
        if (this.status === taskStatus.Todo) {
            this.status = taskStatus.Done;
        }
    }

    reopenTask() {
        if (this.status === taskStatus.Done) {
            this.status = taskStatus.Todo;
        }
    }

    toggleNotify() {
        if (this.dueDate < new Date()) {
            this.notify = !this.notify;
        }
    }

    addSubTask(description, observation, priority, dueDate, notify) {
        const subTask = new SubTask(description, observation, priority, dueDate, notify);
        this.#_subTasks.push(subTask);
    }

    #validateContract() {
        const contract = new ContractValidator()
            .requires(description)
            .isString(description)
            .hasMaxLen(description, 100)

            .isString(observation)
            .hasMaxLen(observation, 500)

            .isRequired(priority)
            .isInteger(priority)

            .isRequired(dueDate)
            .isDate(dueDate)

            .isBoolean(notify);

        return contract.isValid;
    }
}