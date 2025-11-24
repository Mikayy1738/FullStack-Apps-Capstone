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
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.insertOne('user', {username, email, password: hashedPassword});
    const session = await db.insertOne("session", {user: user.id});
    res.cookie("VenueReviewSessionID", session.id).send({...user, password: undefined});
  }
  catch(e){
    console.log(e.message);
    res.sendStatus(500);
  }
});

userAPI.post("/login", async (req, res) => {
  const {email, password} = req.body;
  try {
    const user = await db.findOne('user', (val) => val.email === email);
    if(!user){
      res.sendStatus(401);
      return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid){
      res.sendStatus(401);
      return;
    }
    const session = await db.insertOne("session", {user: user.id});
    res.cookie("VenueReviewSessionID", session.id).send({...user, password: undefined});
  }
  catch(e){
    console.log(e.message);
    res.sendStatus(500);
  }
})

userAPI.get("/me", async (req, res) => {
  try {
    const sessionId = req.cookies?.VenueReviewSessionID;
    if (!sessionId) {
      res.sendStatus(401);
      return;
    }
    const session = await db.findOne('session', (s) => s.id === sessionId);
    if (!session) {
      res.sendStatus(401);
      return;
    }
    const user = await db.findOne('user', (u) => u.id === session.user);
    if (!user) {
      res.sendStatus(401);
      return;
    }
    res.send({...user, password: undefined});
  }
  catch(e){
    console.log(e.message);
    res.sendStatus(500);
  }
})

userAPI.post("/logout", async (req, res) => {
  try {
    const sessionId = req.cookies?.VenueReviewSessionID;
    if (sessionId) {
      await db.deleteOne('session', sessionId);
    }
    res.clearCookie("VenueReviewSessionID").sendStatus(200);
  }
  catch(e){
    console.log(e.message);
    res.sendStatus(500);
  }
})

export default userAPI