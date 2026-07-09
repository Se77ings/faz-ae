import { DataBaseSchema } from './databaseSchema';

let dbInstance = null;

export async function initializeDatabase(database) {
    try {
        await database.execAsync(InitialSchema);
        dbInstance = database;
    } catch (error) {
        console.error("Erro ao inicializar o banco de dados:", error);
        throw error;
    }
}

export function getDatabaseInstance() {
    if (!dbInstance) {
        throw new Error("Banco de dados ainda não foi inicializado.");
    }
    return dbInstance;

}