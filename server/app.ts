import express from 'express'; 

/**
 * An class to distinguish an express app from Function type
 */
class expressApp {
    express: Function
    constructor() {
        this.express = express();
    }
}
/**
 * Server to establish connection to client
 */
class myServer {
    app: expressApp;
    /**
     * Creates an server instance
     * @param app express application
     */
    constructor(express: expressApp) {
        this.app = express;
    }
}
/**
 * Client to connect to central server
 */
class client {
    id: string;
    port: number;
    hostname: string;
    constructor(port: number, hostname: string, id:string) {
        this.port = port;
        this.hostname = hostname;
        this.id = id;
    }
}
/**
 * Mange installed on clients
 */
class manager {
    approved_programs: string[];
    client_programs: Map<string, string[]>;
    constructor() {
        this.approved_programs = [];
        this.client_programs = new Map();
    }
    public approve_program(program: string) {
        this.approved_programs.push(program);
    }
    public revoke_program(program: string) {
        this.approved_programs = this.approved_programs.filter((p) => p !== program);
    }
    public assign_program(client_id: string, program: string) {
        if (!this.client_programs.has(client_id)) {
            this.client_programs.set(client_id, []);
        }
        this.client_programs.get(client_id)?.push(program);
    }
    public get_client_programs(client_id: string): string[] | undefined {
        return this.client_programs.get(client_id);
    }
    public get_approved_programs(): string[] {
        return this.approved_programs;
    }
    public is_program_approved(program: string): boolean {
        return this.approved_programs.includes(program);
    }
}
import fs from 'fs/promises';
/**
 * Custom minimal database
 */
class db {
    database: string; // this should be a file path
    payload: string;
    constructor(database: string) {
        this.database = `${database}`;
        this.payload = "";
        
        
    }
    public async init_schema() {
        fs.appendFile(this.database, ""); // create file if not exists
        const line = new entry("logger", "db_log", "init");
        await this.store_entry(line);
    }
    public async store_entry(line: entry) {
        // load file
        await this.loadFile();
        // insertition logic
        this.payload = this.payload.replaceAll(line.as_string(), ""); // remove dups
        this.payload += line.as_string(); // add entry
        // commit changes
        await this.commit_entry();
    }
    private async commit_entry() {
        await fs.writeFile(this.database, this.payload);
    }
    private async loadFile(query?: boolean) {
        const data = await fs.readFile(this.database).then((data) => data.toString());
        if (query === true) return data; // return for query
        this.payload = data; // Load into payload
    }
    /**
     * selects entries from db
     * @returns database entries
     */
    public async select(table?: string): Promise<entry[]> {
        
        const results = await this.loadFile(true).then((data) => {
            const lines = (data || "").split("\n").filter((line) => line.trim().length > 0 && (table ? line.includes(`:${table}:`) : true));
            return lines.map((line) => {
                const content = line.slice(1, -1).split(":");
                return new entry(content[0], content[1], content[2].split("***"));
            });
        });

        return results;
    }
}
/**
 * Entry format helper for db class
 */
class entry {
    id: string;
    table: string;
    data: string | string[];
    constructor(id: string, table: string, data: string | string[]) {
        this.id = id;
        this.table = table;
        this.data = data;
    }
    public as_string() {
        return `<${this.id}:${this.table}:${Array.isArray(this.data) ? this.data.join("***") : this.data.replaceAll(" ", "***")}>\n`;
    }
}
/**
 * testing stuff
 */
async function main() {
    const a = new db('./database.db');
    a.init_schema();
    const x = new entry("app", "installs", "data2s.sql word.txt beans java script mirror.ts");
    await a.store_entry(x);
    console.log(await a.select(""));
}
// main();

module.exports = { myServer, client, manager, db, entry, expressApp };