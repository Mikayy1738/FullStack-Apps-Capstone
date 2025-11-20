import { Router } from "express";
import bcrypt from 'bcrypt';
import * as db from '../database/index.js'

const userAPI = Router();

userAPI.post("/create", async (req, res) => {
  const {password, username, email} = req.body;
  try {
    const presentUser = await db.findMany('user', (val) => val.username === username || val.email === email);
    if (presentUser.length){
      res.sendStatus(409);
      return;
    }
    await db.insertOne('user', {username, email, password : await bcrypt.hash(password, 10)});
    res.sendStatus(201);
  }
  catch(e){
    console.log(e.message);
    res.sendStatus(500);
  }
})

export default userAPI