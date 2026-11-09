-- Align TaskStatus with MVP business rule #37 (Todo / In Progress / Blocked / Completed).
-- Renaming preserves existing rows: any task previously "cancelled" becomes "blocked".
ALTER TYPE "TaskStatus" RENAME VALUE 'cancelled' TO 'blocked';
