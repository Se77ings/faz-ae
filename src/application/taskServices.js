import TaskAggregate from '../domain/entities/taskAggregate';
import { taskStatus } from '../domain/enumerations/taskStatus';

// TDS-6: antecedência padrão até existir a tela de Configurações com os intervalos do usuário.
const ALARM_LEAD_MINUTES = 60;

export default class TaskService {
    // alarmScheduler é opcional: telas que só listam tarefas não mexem em alarmes.
    constructor(taskRepository, alarmScheduler = null) {
        this._taskRepository = taskRepository;
        this._alarmScheduler = alarmScheduler;
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

            return await this.#persistAsync(task);
        } catch (error) {
            console.error("Erro na camada de aplicação ao salvar tarefa:", error.message);
            return false;
        }
    }

    async deleteAsync(id) {
        if (!id) return false;
        const deleted = await this._taskRepository.deleteAsync(id);
        if (deleted) this.#cancelAlarm(id);
        return deleted;
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
        return await this.#persistAsync(task);
    }

    async reopenTaskAsync(taskId) {
        try {
            const task = await this._taskRepository.getByIdAsync(taskId);
            if (!task) return false;

            // TODO: Futuramente, verificar se a dueDate da tarefa é uma data válida no futuro antes de permitir a reabertura (Regra de Negócio). <TDS-23>

            task.reopenTask();
            return await this.#persistAsync(task);
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

    async #persistAsync(task) {
        const saved = await this._taskRepository.saveAsync(task);
        if (saved) this.#syncAlarm(task);
        return saved;
    }

    // Uma falha no alarme não desfaz o que já foi salvo: a tarefa continua válida sem ele.
    #syncAlarm(task) {
        if (!this._alarmScheduler) return;

        try {
            const shouldRing = task.notify && task.status === taskStatus.Todo && task.dueDate > new Date();
            if (!shouldRing) {
                this._alarmScheduler.cancel(task.id);
                return;
            }
            this._alarmScheduler.schedule(task, this.#alarmTimeFor(task));
        } catch (error) {
            console.error("Erro ao sincronizar o alarme da tarefa:", error);
        }
    }

    #cancelAlarm(taskId) {
        try {
            this._alarmScheduler?.cancel(taskId);
        } catch (error) {
            console.error("Erro ao cancelar o alarme da tarefa:", error);
        }
    }

    // Se a antecedência já passou (prazo próximo), o alarme toca no próprio prazo.
    #alarmTimeFor(task) {
        const withLead = new Date(task.dueDate.getTime() - ALARM_LEAD_MINUTES * 60 * 1000);
        return withLead > new Date() ? withLead : task.dueDate;
    }
}