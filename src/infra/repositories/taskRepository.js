import { getDatabaseInstance } from '../Database/sqlite-connection';
import TaskAggregate from '../../domain/entities/TaskAggregate';

export default class TaskRepository {
    constructor() {
        this._db = getDatabaseInstance();
    }

    async saveAsync(task) {
        try {
            await this._db.withTransactionAsync(async () => {
                const queryTask = `
                  INSERT OR REPLACE INTO tasks 
                  (id, description, observation, priority, dueDate, createdDate, notify, status, progressPercentage)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                `;

                await this._db.runAsync(queryTask, [
                    task.id.toString(),
                    task.description,
                    task.observation || null,
                    task.priority,
                    task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate,
                    task.createdDate instanceof Date ? task.createdDate.toISOString() : task.createdDate,
                    task.notify ? 1 : 0,
                    task.status,
                    task.progressPercentage
                ]);

                await this._db.runAsync(`DELETE FROM sub_tasks WHERE task_id = ?;`, [task.id.toString()]);

                if (task.subTasks && task.subTasks.length > 0) {
                    const querySubTask = `
                      INSERT INTO sub_tasks 
                      (id, task_id, description, observation, priority, dueDate, createdDate, notify, status)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                    `;

                    for (const sub of task.subTasks) {
                        await this._db.runAsync(querySubTask, [
                            sub.id.toString(),
                            task.id.toString(),
                            sub.description,
                            sub.observation || null,
                            sub.priority,
                            sub.dueDate instanceof Date ? sub.dueDate.toISOString() : sub.dueDate,
                            sub.createdDate instanceof Date ? sub.createdDate.toISOString() : sub.createdDate,
                            sub.notify ? 1 : 0,
                            sub.status
                        ]);
                    }
                }
            });
            return true;
        } catch (error) {
            console.error("Falha ao persistir a Task e suas subtasks:", error);
            return false;
        }
    }

    async getAllAsync(page = 1, pageSize = 20) {
        try {
            const offset = (page - 1) * pageSize;

            const queryTasks = `SELECT * FROM tasks LIMIT ? OFFSET ?;`;
            const taskRows = await this._db.getAllAsync(queryTasks, [pageSize, offset]);

            if (taskRows.length === 0) return [];

            const taskIds = taskRows.map(row => `'${row.id}'`).join(',');
            const querySubTasks = `SELECT * FROM sub_tasks WHERE task_id IN (${taskIds});`;
            const subRows = await this._db.getAllAsync(querySubTasks);

            return taskRows.map(row => {
                const associatedSubRows = subRows.filter(sub => sub.task_id === row.id);
                return this.#mapToAggregate(row, associatedSubRows);
            });
        } catch (error) {
            console.error("Falha ao obter a listagem paginada de tarefas:", error);
            return [];
        }
    }
    async getByIdAsync(id) {
        const queryTask = `SELECT * FROM tasks WHERE id = ?;`;
        const row = await this._db.getAsync(queryTask, [id.toString()]);

        if (!row) return null;

        const querySubTasks = `SELECT * FROM sub_tasks WHERE task_id = ?;`;
        const subRows = await this._db.getAllAsync(querySubTasks, [id.toString()]);

        return this.#mapToAggregate(row, subRows);
    }

    async deleteAsync(id) {
        try {
            const query = `DELETE FROM tasks WHERE id = ?;`;
            await this._db.runAsync(query, [id.toString()]);

            return true;
        } catch (error) {
            console.error("Falha ao persistir a Task e suas subtasks:", error);
            return false;
        }
    }

    #mapToAggregate(taskRow, subRows) {
        const mappedSubTasks = subRows.map(sub => ({
            id: sub.id,
            description: sub.description,
            observation: sub.observation,
            priority: sub.priority,
            dueDate: new Date(sub.dueDate),
            createdDate: new Date(sub.createdDate),
            notify: sub.notify === 1,
            status: sub.status
        }));

        return TaskAggregate.createFromDatabase(taskRow, mappedSubTasks);
    }
}