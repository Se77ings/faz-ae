import * as Crypto from 'expo-crypto';

export class SubTask {
    id;
    description;
    priority;
    createdDate;
    notify;
    status;

    constructor(description, status = 1, id = null, priority = 0, createdDate = null, notify = 0) {
        this.id = id || Crypto.randomUUID();
        this.description = description;
        this.priority = priority ?? 0; 
        this.createdDate = createdDate ? new Date(createdDate) : new Date();
        this.notify = notify ?? 0;    
        this.status = status ?? 1;
    }

    complete() {
        this.status = 2;
    }

    reopen() {
        this.status = 1;
    }
}