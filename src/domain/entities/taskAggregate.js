import { taskStatus } from "../enumerations/taskStatus.js";
import { ContractValidator } from "../validation/contractValidator.js";
import * as Crypto from 'expo-crypto';

export default class TaskAggregate {
    id;
    description;
    observation;
    priority;
    dueDate;
    createdDate;
    notify;
    status;

    progressPercentage;

    get subTasks() {
        return this.#_subTasks;
    }
    #_subTasks = [];

    constructor(description, observation, priority, dueDate, notify) {

        if (!this.#validateContract(description, observation, priority, dueDate, notify)) {
            throw new Error("Falha na validação de domínio: Dados inválidos para TaskAggregate.");
        }

        this.id = Crypto.randomUUID();
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

    #processCalculatedProperties() {
        this.progressPercentage = this.#_subTasks.length > 0 ? (this.#_subTasks.filter(st => st.status === taskStatus.Done).length / this.#_subTasks.length) * 100 : 0;
    }

    #validateContract(description, observation, priority, dueDate, notify) {
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

static createFromDatabase(rawData, subTasks = []) {
    const instance = new TaskAggregate(
      rawData.description,
      rawData.observation || '',
      rawData.priority,
      new Date(rawData.dueDate),
      rawData.notify === 1 || rawData.notify === true
    );

    instance.id = rawData.id;
    instance.createdDate = new Date(rawData.createdDate);
    instance.status = rawData.status;

    instance.#_subTasks = Array.isArray(subTasks) ? subTasks : [];
    instance.#processCalculatedProperties();

    return instance;
  }
}