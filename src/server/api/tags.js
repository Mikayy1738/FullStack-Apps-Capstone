import { Router } from "express";
import * as db from '../database/index.js'
import venuesAPI from "./venues.js";

const tagAPI = Router();

tagAPI.post('/create', async (req, res) => {
  const {name} = req.body;
  try {
    const dbTag = await db.findOneBy('tag', {name});
    if (dbTag){
      res.sendStatus(409);
      return;
    }
    const created = await db.insertOne('tag', {name, color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, "0")}`, venueIDs: []});
    res.status(201).send({id: created.id});
  }
    catch(e){
    console.log(e.message);
    res.sendStatus(500);
  }
})

tagAPI.put('/add', async (req, res) => {
  const {venueID, tagID} = req.body;
  try {
    const dbTag = await db.findOneBy('tag', {id: tagID});
    if (!dbTag){
      res.sendStatus(404);
      return;
    }
    if (dbTag.venueIDs.includes(venueID)){
      res.sendStatus(409);
      return;
    }
    const dbVenue = await db.findOneBy('venue', {id: venueID});
    if (!dbVenue){
      res.sendStatus(404);
      return;
    }
    if (dbVenue.tagIDs.includes(tagID)){
      res.sendStatus(409);
      return;
    }
    await db.transact((doc) => {
      console.log(doc.tag)
      const venueIndex = doc.venue.findIndex(venue => venue.id === venueID);
      doc.venue[venueIndex].tagIDs.push(tagID);
      
      const tagIndex = doc.tag.findIndex(tag => tag.id === tagID);
      doc.tag[tagIndex].venueIDs.push(venueID);
    });
    res.sendStatus(201);
  }
  catch(e){
    console.log(e.message);
    res.sendStatus(500);
  }
})

export default tagAPI;