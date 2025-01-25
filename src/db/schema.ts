import { integer, pgTable, varchar, timestamp, text } from "drizzle-orm/pg-core";

export const todosTable = pgTable("todos", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: text().notNull(),
    description: varchar({ length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})