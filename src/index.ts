import { db } from "./db/index.js";
import { todosTable } from "./db/schema";
import { ilike, eq } from "drizzle-orm";
import readlineSync from "readline-sync";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.js";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY
});

async function getAllTodos() {
    const todos = await db.select().from(todosTable);
    return todos;
}

async function createTodo(title: string, description: string) {
    const [ result ] = await db.insert(todosTable).values({
        title,
        description,
    }).returning({
        id: todosTable.id
    });

    return result.id;
}

async function searchTodo(search: string) {
    const todos = await db.select().from(todosTable).where(ilike(todosTable.title, `%${search}%`));
    return todos;
}

async function deleteTodoById(id: number) {
    await db.delete(todosTable).where(eq(todosTable.id, id));
}


const tools = {
    getAllTodos: getAllTodos,
    createTodo: createTodo,
    deleteTodoById: deleteTodoById,
    searchTodo: searchTodo,
};

const SYSTEM_PROMPT = `

    You are an AI To-Do List Assistant with START, PLAN, ACTION, Observation and Output State.
    Wait for the user prompt and first PLAN using available tools.
    After planning, Take the action with appropriate tools and wait for Observation based on Action.
    Once you get the observations, Return the AI response based on START prompt and observations

    You can manage tasks by adding, viewing, updating, and deleting them.
    You must strictly follow the JSON output format.

    Todo DB Schema:
    id: Int and Primary Key
    title: String
    description: String
    created_at: Date Time
    updated_at: Date Time

    Available Tools:
    - getAllTodos(): Returns all the Todos from Database
    - createTodo(title: string, description: string): Creates a new Todo in the DB and takes todo as a string and returns the ID of created todo
    - deleteTodoById(id: string): Deleted the todo by ID given in the DB
    - searchTodo(query: string): Searches for all todos matching the query string using iLike in DB

    Example:
    START
    { "type": "user", "user": "Add a task for shopping groceries." }
    { "type": "plan", "plan": "I will try to get more context on what user needs to shop." }
    { "type": "output", "output": "Can you tell me what all items you want to shop for?" }
    { "type": "user", "user": "I want to shop for milk, kurkure, lays and choco." }
    { "type": "plan", "plan": "I will use createTodo to create a new Todo in DB." }
    { "type": "action", "function": "createTodo", "input": "Shopping for milk, kurkure, lays and choco." } 
    { "type": "observation", "observation": "2" }
    { "type": "output", "output": "Your todo has been added successfully" }

`;

const messages: Array<ChatCompletionMessageParam> = [ { role: 'system', content: SYSTEM_PROMPT } ];

async function main() {
  while(true) {
    const query = readlineSync.question('>> ');
    const userMessage = {
      type: 'user',
      user: query
    };
  
    messages.push({ role: 'user', content: JSON.stringify(userMessage) });
  
    // ### autoprompting
  
    while(true) {
      const chat = await client.chat.completions.create({
        model: "openai/gpt-3.5-turbo",
        messages: messages,
        response_format: { type: 'json_object' },
      });
  
      const result = chat.choices[0].message.content;
      messages.push({ role: 'assistant', content: result });

      console.log(`\n\n---------------- START AI ------------------`);
      console.log(result);
      console.log(`--------------------- END AI -------------------`);

      const action = JSON.parse(result!);

      if(action.type === "output") {
        console.log(`🤖: ${action.output}`);
        break;
      } else if(action.type === "action") {
        //@ts-ignore
        const fn = tools[action.function];
        if(!fn) {
          throw new Error("Invalid Tool Call");
        }
        const observation = await fn(action.input);
        const observationMessage = {
          type: "observation",
          observation: observation
        }

        messages.push({ role: "developer", content: JSON.stringify(observationMessage) });

      }
    }
  }
}

main();
