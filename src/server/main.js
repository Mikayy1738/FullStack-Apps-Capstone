import express from "express";
import ViteExpress from "vite-express";
import * as db from "./database/index.js";
import { fsAdapter } from "./database/fsAdapter.js";
import bodyParser from "body-parser";
import api from './api/index.js'

const app = express();

app.use(bodyParser.json());

//db setup middleware
app.use(async (req, res,  next) => {
  db.useAdapter(new fsAdapter(["user"]));
  await db.boot();
  next();
})

app.use("/api", api);

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
