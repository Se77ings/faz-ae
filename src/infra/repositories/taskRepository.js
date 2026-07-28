import { getDatabaseInstance } from '../database/sqlite-connection';
import TaskAggregate from '../../domain/entities/taskAggregate';
import { SubTask } from '../../domain//entities/subTask';

export default class TaskRepository {
    constructor() { }

    #getDatabaseConnection() {
        return getDatabaseInstance();
    }

    async saveAsync(taskAggregate) {
        try {
            const db = this.#getDatabaseConnection(); // Removemos o await

            const queryTask = `
                INSERT OR REPLACE INTO tasks (id, description, observation, priority, dueDate, createdDate, notify, status) 
                VALUES ($id, $description, $observation, $priority, $dueDate, $createdDate, $notify, $status);
            `;

            try {
                await db.runAsync(queryTask, {
                    $id: taskAggregate.id.toString(),
                    $description: taskAggregate.description,
                    $observation: taskAggregate.observation || '',
                    $priority: taskAggregate.priority || 0,
                    $dueDate: taskAggregate.dueDate ? taskAggregate.dueDate.toISOString() : null,
                    $createdDate: taskAggregate.createdDate.toISOString(),
                    $notify: taskAggregate.notify ? 1 : 0,
                    $status: taskAggregate.status
                });
            } catch (errTask) {
                console.error("[ERRO SQL] Falha no INSERT/REPLACE da tabela 'tasks'.", errTask);
                throw errTask;
            }

            try {
                await db.runAsync(`DELETE FROM sub_tasks WHERE task_id = $taskId;`, {
                    $taskId: taskAggregate.id.toString()
                });
            } catch (errDelete) {
                console.error("[ERRO SQL] Falha no DELETE da tabela 'sub_tasks'.", errDelete);
                throw errDelete;
            }

            const subTasks = taskAggregate.subTasks || [];
            if (subTasks.length > 0) {
                const querySubTask = `
                    INSERT INTO sub_tasks (id, task_id, description, priority, createdDate, notify, status) 
                    VALUES ($id, $taskId, $description, $priority, $createdDate, $notify, $status);
                `;

                for (let i = 0; i < subTasks.length; i++) {
                    const st = subTasks[i];

                    try {
                        await db.runAsync(querySubTask, {
                            $id: st.id.toString(),
                            $taskId: taskAggregate.id.toString(),
                            $description: st.description,
                            $priority: st.priority || (i + 1),
                            $createdDate: new Date(st.createdDate).toISOString(),
                            $notify: st.notify ? 1 : 0,
                            $status: st.status || 1
                        });
                    } catch (errSub) {
                        console.error(`[ERRO SQL] Falha no INSERT da sub_task ID: ${st.id}`, errSub);
                        throw errSub;
                    }
                }
            }

            return true;
        } catch (error) {
            console.error("[ERRO GERAL] Falha no fluxo de saveAsync:", error);
            return false;
        }
    }

    async getAllAsync(page = 1, pageSize = 20) {
        try {
            const db = this.#getDatabaseConnection(); // Síncrono

            const limit = parseInt(pageSize, 10) || 20;
            const offset = parseInt((page - 1) * limit, 10) || 0;

            const queryTasks = `SELECT * FROM tasks ORDER BY priority DESC LIMIT $limit OFFSET $offset;`;
            const taskRows = await db.getAllAsync(queryTasks, { $limit: limit, $offset: offset });

            if (!taskRows || taskRows.length === 0) return [];

            const taskIds = taskRows.map(row => `'${row.id}'`).join(',');
            const querySubTasks = `SELECT * FROM sub_tasks WHERE task_id IN (${taskIds});`;
            const subRows = await db.getAllAsync(querySubTasks, []); // Array vazio no lugar de nada

            return taskRows.map(row => {
                const associatedSubRows = subRows.filter(sub => sub.task_id === row.id);
                return this.#mapToAggregate(row, associatedSubRows);
            });
        } catch (error) {
            console.error("Falha ao obter a listagem paginada de tarefas:", error.message);
            return [];
        }
    }

    async getByIdAsync(id) {
        try {
            const db = this.#getDatabaseConnection();
            const safeId = id ? id.toString() : "";

            const queryTask = `SELECT * FROM tasks WHERE id = $id;`;
            const row = await db.getFirstAsync(queryTask, { $id: safeId });

            if (!row) return null;

            const querySubTasks = `SELECT * FROM sub_tasks WHERE task_id = $id;`;
            const subRows = await db.getAllAsync(querySubTasks, { $id: safeId });

            return this.#mapToAggregate(row, subRows);
        } catch (error) {
            console.error("[ERRO GERAL] Falha no fluxo de getByIdAsync:", error);
            return null;
        }
    }

    async deleteAsync(id) {
        try {
            const db = this.#getDatabaseConnection(); // Síncrono
            const query = `DELETE FROM tasks WHERE id = $id;`; // Usando parametro nomeado pra manter padrão
            await db.runAsync(query, { $id: id.toString() });
            return true;
        } catch (error) {
            console.error("Falha ao deletar a Task:", error);
            return false;
        }
    }

    #mapToAggregate(taskRow, subRows) {
        let mappedSubTasks = [];

        if (subRows && subRows.length > 0) {
            mappedSubTasks = subRows.map(subRow => SubTask.restore(subRow));
        }

        return TaskAggregate.createFromDatabase(taskRow, mappedSubTasks);
    }
}