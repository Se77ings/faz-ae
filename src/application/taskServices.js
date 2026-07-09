import TaskAggregate from '../domain/entities/taskAggregate';

export default class TaskService {
    constructor(taskRepository) {
        this._taskRepository = taskRepository;
    }

    async getByIdAsync(id) {
        if (!id) return null;
        return await this._taskRepository.getByIdAsync(id);
    }

    async getListAsync(page = 1, pageSize = 20) {
        return await this._taskRepository.getAllAsync(page, pageSize);
    }

    async saveAsync(taskData) {
        try {
            let task;

            if (taskData.id) {
                task = await this._taskRepository.getByIdAsync(taskData.id);
                if (!task) return false;

                task.description = taskData.description;
                task.observation = taskData.observation;
                task.priority = taskData.priority;
                task.dueDate = taskData.dueDate;
                task.notify = taskData.notify;
                task.status = taskData.status;
            } else {
                task = new TaskAggregate(
                    taskData.description,
                    taskData.observation,
                    taskData.priority,
                    taskData.dueDate,
                    taskData.notify
                );
            }

            return await this._taskRepository.saveAsync(task);
        } catch (error) {
            console.error("Erro na camada de aplicação ao salvar tarefa:", error.message);
            return false;
        }
    }

    async deleteAsync(id) {
        if (!id) return false;
        return await this._taskRepository.deleteAsync(id);
    }
}