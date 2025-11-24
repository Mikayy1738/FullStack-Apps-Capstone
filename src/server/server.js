import ViteExpress from "vite-express";
import makeApp from './app.js';

ViteExpress.listen(makeApp(["user", "session"]), 3000, () =>
  console.log("Server is listening on port 3000..."),
);