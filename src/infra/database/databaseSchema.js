export const DataBaseSchema = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    description TEXT NOT NULL,
    observation TEXT,
    priority INTEGER NOT NULL,
    dueDate TEXT NOT NULL,
    createdDate TEXT NOT NULL,
    notify INTEGER NOT NULL,
    status INTEGER NOT NULL,
    progressPercentage REAL NOT NULL DEFAULT 0.0
  );

  CREATE TABLE IF NOT EXISTS sub_tasks (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER NOT NULL,
    createdDate TEXT NOT NULL,
    notify INTEGER NOT NULL,
    status INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
  );
`;