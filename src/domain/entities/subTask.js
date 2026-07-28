import * as Crypto from 'expo-crypto';
import { taskStatus } from "../enumerations/taskStatus.js";

export class SubTask {
    id;
    description;
    priority; // Não estou usando por enquanto
    createdDate;
    notify;  // Não estou usando por enquanto
    status;

    constructor(description) {
        this.id = Crypto.randomUUID();
        this.description = description;
        this.priority = 0;
        this.createdDate = new Date();
        this.notify = 0;
        this.status = taskStatus.Todo;
    }

    complete() {
        if (this.status === taskStatus.Todo) {
            this.status = taskStatus.Done;
        }
    }

    reopen() {
        if (this.status === taskStatus.Done) {
            this.status = taskStatus.Todo;
        }
    }

    static restore(rawData) {
        var instance = new SubTask(rawData.description);
        instance.id = rawData.id;
        instance.priority = rawData.priority || 0;
        instance.createdDate = rawData.createdDate ? new Date(rawData.createdDate) : new Date();
        instance.notify = rawData.notify || 0;

        instance.status = taskStatus.parse(rawData.status);

        return instance;
    }
}