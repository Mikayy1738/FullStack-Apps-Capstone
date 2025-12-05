import { Router } from "express";
import * as db from '../database/index.js'

const tagAPI = Router();

tagAPI.get("/:id", async (req, res) => {
  const {id} = req.params;
  try{
    const tag = await db.findOneBy('tag', {id});
    if (!tag){
      res.sendStatus(404);
      return;
    }
    tag.venues = [];
    for (let venueID of tag.venueIDs){
      const venue = await db.findOneBy('venue', {id: venueID});
      venue.tags = [];
      for(let tagID of venue.tagIDs){
        venue.tags.push(await db.findOneBy('tag', {id: tagID}))
      }
      tag.venues.push(venue)
    }
    res.send(tag);
  }
  catch(e){
    console.log(e.message);
    res.sendStatus(500);
  }
})

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
});

tagAPI.post("/upsert", async (req, res) => {
  const {name, venueID} = req.body;
  try{
    let dbTag = await db.findOneBy('tag', {name});
    if (!dbTag){
      dbTag = await db.insertOne('tag', {name, color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, "0")}`, venueIDs: []});
    }
    const tagID = dbTag.id;
    await db.transact((doc) => {
      const venueIndex = doc.venue.findIndex(venue => venue.id === venueID);
      doc.venue[venueIndex].tagIDs.push(tagID);
      
      const tagIndex = doc.tag.findIndex(tag => tag.id === tagID);
      doc.tag[tagIndex].venueIDs.push(venueID);
    });
  }
  catch(e){
    console.log(e.message);
    res.sendStatus(500);
  }
})

tagAPI.get("/list", async (req, res) => {
  try{

    const tagList = await db.findManyBy("tag");
    res.send(tagList);
  }
    catch(e){
    console.log(e.message);
    res.sendStatus(500);
  }
})

export default tagAPI;