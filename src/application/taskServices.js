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

    async completeTaskAsync(taskId) {
        if (!taskId) return false;

        const task = await this._taskRepository.getByIdAsync(taskId);
        if (!task) return false;

        if (task.subTasks && task.subTasks.length > 0) {
            const pendingSubTasks = task.subTasks.filter(subTask => subTask.status !== 2);

            for (const subTask of pendingSubTasks) {
                subTask.complete();
            }
        }

        task.completeTask();
        return await this._taskRepository.saveAsync(task);
    }

    async reopenTaskAsync(taskId) {
        try {
            const task = await this._taskRepository.getByIdAsync(taskId);
            if (!task) return false;

            // TODO: Futuramente, verificar se a dueDate da tarefa é uma data válida no futuro antes de permitir a reabertura (Regra de Negócio). <TDS-23>

            task.reopenTask();
            return await this._taskRepository.saveAsync(task);
        } catch (error) {
            console.error("Erro ao reabrir tarefa principal:", error);
            return false;
        }
    }

    async completeSubTaskAsync(taskId, subTaskId) {
        try {
            const task = await this._taskRepository.getByIdAsync(taskId);
            if (!task) return false;

            var subTask = task.subTasks.find(st => st.id === subTaskId);
            if (subTask) {
                subTask.complete();
                return await this._taskRepository.saveAsync(task);
            }
            return false;
        } catch (error) {
            console.error("Erro ao completar subTask:", error);
            return false;
        }
    }

    async reopenSubTaskAsync(taskId, subTaskId) {
        try {
            const task = await this._taskRepository.getByIdAsync(taskId);
            if (!task) return false;

            var subTask = task.subTasks.find(st => st.id === subTaskId);
            if (subTask) {
                subTask.reopen();
                return await this._taskRepository.saveAsync(task);
            }
            return false;
        } catch (error) {
            csonsole.error("Erro ao reabrir subTask:", error);
            return false;
        }
    }
}