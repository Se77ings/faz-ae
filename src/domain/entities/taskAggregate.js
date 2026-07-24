import { taskStatus } from "../enumerations/taskStatus.js";
import { ContractValidator } from "../validation/contractValidator.js";
import { TaskValidator } from "../validation/taskValidator.js";
import { SubTask } from "./subTask.js";
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

        if (!TaskValidator.validateMainTask(description, observation, priority, dueDate, notify)) {
            throw new Error("Falha na validação de domínio: Dados inválidos para TaskAggregate.");
        }

        this.id = Crypto.randomUUID();
        this.description = description;
        this.observation = observation ?? null;
        this.priority = priority;
        this.dueDate = dueDate;
        this.createdDate = new Date();
        this.notify = notify ?? false;
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

    addSubTasks(subTasksArray) {
        if (!Array.isArray(subTasksArray) || subTasksArray.length === 0) return [];

        const warnings = [];
        const validSubTasks = [];

        for (const st of subTasksArray) {
            if (!TaskValidator.validateSubTask(st.description)) {
                warnings.push(`A sub-tarefa "${st.description || 'Sem nome'}" possui dados inválidos e foi ignorada.`);
                continue;
            }

            validSubTasks.push(new SubTask(
                st.description,
                st.status,
                st.id,
                st.priority,
                st.createdDate,
                st.notify
            ));
        }

        this.#_subTasks.push(...validSubTasks);
        this.#processCalculatedProperties();

        return warnings;
    }

    update(description, observation, priority, dueDate, notify, subTasks) {
        if (!TaskValidator.validateMainTask(description, observation, priority, dueDate, notify)) {
            throw new Error("Falha na validação de domínio: Dados inválidos para atualização.");
        }

        this.description = description;
        this.observation = observation ?? null;
        this.priority = priority;
        this.dueDate = dueDate;
        this.notify = notify ?? false;

        if (Array.isArray(subTasks)) {
            this.#_subTasks = [];
            this.addSubTasks(subTasks);
        }

        this.#processCalculatedProperties();
    }

    #processCalculatedProperties() {
        this.progressPercentage = this.#_subTasks.length > 0 ? (this.#_subTasks.filter(st => st.status === taskStatus.Done).length / this.#_subTasks.length) * 100 : 0;
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