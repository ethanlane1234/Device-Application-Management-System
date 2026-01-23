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
    constructor() {

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
                return new entry(content[0], content[1], content[2].replace("***", " "));
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
    data: string;
    constructor(id: string, table: string, data: string) {
        this.id = id;
        this.table = table;
        this.data = data;
    }
    public as_string() {
        return `<${this.id}:${this.table}:${this.data.replace(" ", "***")}>\n`;
    }
}
async function main() {
    const a = new db('./database.db');
    a.init_schema();
    const x = new entry("app", "installs", "data2s");
    await a.store_entry(x);
    console.log(await a.select("db_log"));
}
main();