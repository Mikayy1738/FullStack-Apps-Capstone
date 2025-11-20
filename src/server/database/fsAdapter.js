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
      return JSON.parse(data)
    }
    catch (e) {
      console.log(`Error reading table ${tableName} : ${e.message}`)
      return null;
    }
  } 

  async #createFiles() {
    for (let tableName of this.#tables){
      try{
        await fs.writeFile(`${this.#filePrefix}${tableName}.txt`, new Uint8Array(Buffer.from("[\"init\"]")), {flag:"wx"});
      }
      catch(e){
        if (e.code !== 'EEXIST'){
          console.log(e.message);
        }
      }
    }
  }

  async load(){
    await this.#createFiles();
    const data = {}
    for (let tableName of this.#tables) {
      let table = await this.#readTable(tableName);
      data[tableName] = table;
    }
    return data;
  }

  async save(d){
    const tables = [...this.#tables]
      .forEach(async (tableName) => {
        await fs.writeFile(`${this.#filePrefix}${tableName}.txt`, new Uint8Array(Buffer.from(JSON.stringify(d[tableName]))))
      })
  }
  async reset(){
    for (let tableName of this.#tables){
        await fs.writeFile(`${this.#filePrefix}${tableName}.txt`, new Uint8Array(Buffer.from("[]")));
    }
  }
}