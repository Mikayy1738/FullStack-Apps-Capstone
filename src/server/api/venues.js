import { Router } from "express";
import * as db from '../database/index.js';
import axios from 'axios';

const venuesAPI = Router();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

function calculateVenueStats(placeId) {
  const reviews = db.findMany('review', (r) => r.venueId === placeId);
  const reviewCount = reviews.length;
  const rating = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;
  return { rating, reviewCount };
}

venuesAPI.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    if (!API_KEY) {
      console.error('GOOGLE_PLACES_API_KEY is not set');
      res.status(500).json({ error: 'API key not configured' });
      return;
    }

    // Fetch venues from Google Places API
    const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(search)}&key=${API_KEY}`;
    const response = await axios.get(googleUrl);

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', response.data.status);
      res.status(500).json({ error: 'Failed to fetch venues from Google Places' });
      return;
    }

    // Map Google Places results to venue format and add review stats
    const venuesWithStats = (response.data.results || []).map(place => {
      const stats = calculateVenueStats(place.place_id);
      return {
        id: place.place_id,
        name: place.name,
        location: place.formatted_address,
        description: place.types?.join(', ') || '',
        rating: stats.rating || (place.rating || 0),
        reviewCount: stats.reviewCount,
        googleRating: place.rating,
        googleUserRatingsTotal: place.user_ratings_total,
        geometry: place.geometry,
        photos: place.photos
      };
    });

    const venuesWithTags = [];

    for (let venue of venuesWithStats){
      let dbVenue = await db.findOneBy('venue', {id: venue.id});
      if (!dbVenue){
        dbVenue = await db.insertOne('venue', {...venue, tagIDs: []});
      }
      else{
        dbVenue.tags = [];
        for( let tagID of dbVenue.tagIDs){
          dbVenue.tags.push(await db.findOneBy('tag', {id: tagID}));
        }
      }
      venuesWithTags.push(dbVenue);
    }
    
    res.send(venuesWithTags);
  } catch (e) {
    console.log(e.message);
    res.sendStatus(500);
  }
});

venuesAPI.get("/:id", async (req, res) => {
  try {
    const { id } = req.params; // This will be a Google Place ID
    
    if (!API_KEY) {
      console.error('GOOGLE_PLACES_API_KEY is not set');
      res.status(500).json({ error: 'API key not configured' });
      return;
    }

    // Fetch venue details from Google Places API
    const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&key=${API_KEY}`;
    const response = await axios.get(googleUrl);

    if (response.data.status !== 'OK') {
      console.error('Google Places API error:', response.data.status);
      res.status(404).json({ error: 'Venue not found' });
      return;
    }

    const place = response.data.result;
    const stats = calculateVenueStats(id);
    
    res.send({
      id: place.place_id,
      name: place.name,
      location: place.formatted_address,
      description: place.types?.join(', ') || '',
      rating: stats.rating || (place.rating || 0),
      reviewCount: stats.reviewCount,
      googleRating: place.rating,
      googleUserRatingsTotal: place.user_ratings_total,
      geometry: place.geometry,
      photos: place.photos,
      website: place.website,
      phoneNumber: place.formatted_phone_number,
      openingHours: place.opening_hours,
      googleReviews: place.reviews || []
    });
  } catch (e) {
    console.log(e.message);
    res.sendStatus(500);
  }
});

venuesAPI.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, description } = req.body;
    const sessionId = req.cookies?.VenueReviewSessionID;
    
    if (!sessionId) {
      res.sendStatus(401);
      return;
    }
    
    const session = db.findOne('session', (s) => s.id === sessionId);
    if (!session) {
      res.sendStatus(401);
      return;
    }
    
    const venue = db.findOne('venue', (v) => v.id === id);
    if (!venue) {
      res.sendStatus(404);
      return;
    }
    
    // If createdBy is missing (legacy venues), allow edit for backward compatibility
    // Otherwise, only allow creator to edit
    if (venue.createdBy !== undefined && venue.createdBy !== session.user) {
      res.sendStatus(403);
      return;
    }
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (description !== undefined) updates.description = description;
    
    await db.updateOne('venue', id, updates);
    const updatedVenue = db.findOne('venue', (v) => v.id === id);
    const stats = calculateVenueStats(id);
    
    res.send({
      ...updatedVenue,
      rating: stats.rating,
      reviewCount: stats.reviewCount
    });
  } catch (e) {
    console.log(e.message);
    res.sendStatus(500);
  }
});

venuesAPI.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = req.cookies?.VenueReviewSessionID;
    
    if (!sessionId) {
      res.sendStatus(401);
      return;
    }
    
    const session = db.findOne('session', (s) => s.id === sessionId);
    if (!session) {
      res.sendStatus(401);
      return;
    }
    
    const venue = db.findOne('venue', (v) => v.id === id);
    if (!venue) {
      res.sendStatus(404);
      return;
    }
    
    // If createdBy is missing (legacy venues), allow delete for backward compatibility
    // Otherwise, only allow creator to delete
    if (venue.createdBy !== undefined && venue.createdBy !== session.user) {
      res.sendStatus(403);
      return;
    }
    
    const deleted = await db.deleteOne('venue', id);
    
    if (deleted) {
      const reviews = db.findMany('review', (r) => r.venueId === id);
      for (const review of reviews) {
        await db.deleteOne('review', review.id);
      }
      res.sendStatus(204);
    } else {
      res.sendStatus(404);
    }
  } catch (e) {
    console.log(e.message);
    res.sendStatus(500);
  }
});

export default venuesAPI;

