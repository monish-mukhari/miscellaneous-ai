import { db } from "./db";
import { todosTable } from "./db/schema";
import { ilike, eq } from "drizzle-orm";

async function getAllTodos() {
    const todos = await db.select().from(todosTable);
    return todos;
}

async function createTodo(title: string, description: string) {
    await db.insert(todosTable).values({
        title,
        description,
    });
}

async function searchTodo(search: string) {
    const todos = await db.select().from(todosTable).where(ilike(todosTable.title, search));
    return todos;
}

async function deleteTodoById(id: number) {
    await db.delete(todosTable).where(eq(todosTable.id, id));
}
