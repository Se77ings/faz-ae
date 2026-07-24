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

                task.update(
                    taskData.description ?? task.description,
                    taskData.observation ?? task.observation,
                    taskData.priority ?? task.priority,
                    taskData.dueDate ?? task.dueDate,
                    taskData.notify ?? task.notify,
                    taskData.subTasks ?? task.subTasks
                );
            } else {
                console.log("[LOG TaskService.saveAsync] Iniciando:");
                task = new TaskAggregate(
                    taskData.description,
                    taskData.observation,
                    taskData.priority,
                    taskData.dueDate,
                    taskData.notify
                );
                if (taskData.subTasks && taskData.subTasks.length > 0) {
                    task.addSubTasks(taskData.subTasks);
                }
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