import { openDatabaseAsync } from 'expo-sqlite';
import TaskAggregate from '../../domain/entities/taskAggregate';

export default class TaskRepository {
    constructor() {
    }

    async #getDatabaseConnection() {
        return await openDatabaseAsync('faz_ae.db');
    }

async saveAsync(taskAggregate) {
        try {
            const db = await this.#getDatabaseConnection();

            const queryTask = `
                INSERT OR REPLACE INTO tasks (id, description, observation, priority, dueDate, createdDate, notify, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            `;
            
            await db.runAsync(queryTask, [
                taskAggregate.id,
                taskAggregate.description,
                taskAggregate.observation || '',
                taskAggregate.priority || 0,
                taskAggregate.dueDate.toISOString(), // Conversão obrigatória
                taskAggregate.createdDate.toISOString(), // Conversão obrigatória
                taskAggregate.notify ? 1 : 0, // Conversão de boolean para int
                taskAggregate.status
            ]);

            await db.runAsync(`DELETE FROM sub_tasks WHERE task_id = ?;`, [taskAggregate.id.toString()]);

            const subTasks = taskAggregate.subTasks || [];
            if (subTasks.length > 0) {
                const querySubTask = `INSERT INTO sub_tasks (id, task_id, description, status) VALUES (?, ?, ?, ?);`;
                
                for (const st of subTasks) {
                    await db.runAsync(querySubTask, [
                        st.id.toString(),
                        taskAggregate.id.toString(),
                        st.description,
                        st.status || 1
                    ]);
                }
            }
            return true;
        } catch (error) {
            console.error("Falha ao persistir a Task e suas subtasks:", error);
            return false;
        }
    }

    async getAllAsync(page = 1, pageSize = 20) {
        try {
            const db = await this.#getDatabaseConnection();
            const offset = (page - 1) * pageSize;

            const queryTasks = `SELECT * FROM tasks ORDER BY priority DESC LIMIT ? OFFSET ?;`;
            const taskRows = await db.getAllAsync(queryTasks, [pageSize, offset]);

            if (taskRows.length === 0) return [];

            const taskIds = taskRows.map(row => `'${row.id}'`).join(',');
            const querySubTasks = `SELECT * FROM sub_tasks WHERE task_id IN (${taskIds});`;
            const subRows = await db.getAllAsync(querySubTasks);

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
        try {
            console.log(id);
            const db = await this.#getDatabaseConnection();
            const queryTask = `SELECT * FROM tasks WHERE id = ?;`;
            console.log(db);
            const row = await db.getFirstAsync(queryTask, [id.toString()]);
            if (!row) return null;

            const querySubTasks = `SELECT * FROM sub_tasks WHERE task_id = ?;`;
            const subRows = await db.getAllAsync(querySubTasks, [id.toString()]);

            return this.#mapToAggregate(row, subRows);
        } catch (error) {
            console.error("Falha ao obter tarefa por id:", error);
            return null;
        }
    }

    async deleteAsync(id) {
        try {
            const db = await this.#getDatabaseConnection();
            const query = `DELETE FROM tasks WHERE id = ?;`;
            await db.runAsync(query, [id.toString()]);

            return true;
        } catch (error) {
            console.error("Falha ao deletar a Task:", error);
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