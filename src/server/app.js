import express from "express";
import * as db from "./database/index.js";
import { fsAdapter } from "./database/fsAdapter.js";
import bodyParser from "body-parser";
import api from './api/index.js'

const makeApp = (tables, filePrefix) => {
  const app = express();
  
  app.use(bodyParser.json());
  
  //db setup middleware
  app.use(async (req, res,  next) => {
    db.useAdapter(new fsAdapter(tables, filePrefix));
    await db.boot();
    next();
  })
  
  app.use("/api", api);

  return app;
}


export default makeApp;