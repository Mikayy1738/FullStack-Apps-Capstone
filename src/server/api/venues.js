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
        photos: place.photos,
        website: place.website,
        phoneNumber: place.formatted_phone_number,
        openingHours: place.opening_hours,
        googleReviews: place.reviews || []
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
    res.send(await db.findOneBy('venue', {id}));
  } catch (e) {
    console.log(e.message);
    res.sendStatus(500);
  }
});

export default venuesAPI;

