import fs from 'fs/promises';
import { Buffer } from 'buffer';

export class fsAdapter {
    #tables;
    #filePrefix;
  constructor (tables, filePrefix = "./src/server/database/files/"){
    this.#tables = tables;
    this.#filePrefix = filePrefix;
    this.load = this.load.bind(this);
    this.save = this.save.bind(this);
    this.reset = this.reset.bind(this);
  }

  async #readTable(tableName) {
    try{ 
      const data = await fs.readFile(`${this.#filePrefix}${tableName}.txt`);
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item !== "init");
      }
      return parsed;
    }
    catch (e) {
      console.log(`Error reading table ${tableName} : ${e.message}`)
      return [];
    }
  } 

  async #createFiles() {
    for (let tableName of this.#tables){
      try{
        await fs.writeFile(`${this.#filePrefix}${tableName}.txt`, new Uint8Array(Buffer.from("[]")), {flag:"wx"});
        console.log(`Created database file: ${tableName}.txt`);
      }
      catch(e){
        if (e.code !== 'EEXIST'){
          console.log(`Error creating ${tableName}.txt: ${e.message}`);
        }
      }
    }
  }

  async load(){
    await this.#createFiles();
    const data = {}
    for (let tableName of this.#tables) {
      let table = await this.#readTable(tableName);
      data[tableName] = Array.isArray(table) ? table : [];
    }
    return data;
  }

  async save(d){
    for(let tableName of this.#tables){
      try {
        if (!d[tableName]) {
          console.log(`Warning: Table ${tableName} not found in data object`);
          d[tableName] = [];
        }
        await fs.writeFile(`${this.#filePrefix}${tableName}.txt`, new Uint8Array(Buffer.from(JSON.stringify(d[tableName]))));
      } catch (e) {
        console.log(`Error saving ${tableName}.txt: ${e.message}`);
        throw e;
      }
    }
  }
  async reset(){
    for (let tableName of this.#tables){
        await fs.writeFile(`${this.#filePrefix}${tableName}.txt`, new Uint8Array(Buffer.from("[]")));
    }
  }
}