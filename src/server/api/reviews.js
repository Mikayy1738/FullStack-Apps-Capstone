import { Router } from "express";
import * as db from '../database/index.js';
import axios from 'axios';

const reviewsAPI = Router();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

function calculateVenueStats(venueId) {
  const reviews = db.findMany('review', (r) => r.venueId === venueId);
  const reviewCount = reviews.length;
  const rating = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;
  return { rating, reviewCount };
}

reviewsAPI.get("/venue/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    let venue = db.findOne('venue', (v) => v.id === venueId);
    
    if (!venue) {
      if (API_KEY) {
        try {
          const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${venueId}&key=${API_KEY}`;
          const googleResponse = await axios.get(googleUrl);
          
          if (googleResponse.data.status === 'OK') {
            const place = googleResponse.data.result;
            venue = await db.insertOne('venue', {
              id: place.place_id,
              name: place.name,
              location: place.formatted_address,
              description: place.types?.join(', ') || ''
            });
          } else {
            res.sendStatus(404);
            return;
          }
        } catch (googleError) {
          console.error('Error fetching venue from Google Places:', googleError);
        }
      } else {
        res.sendStatus(404);
        return;
      }
    }
    
    const reviews = db.findMany('review', (r) => r.venueId === venueId);
    const reviewsWithUsers = reviews.map(review => {
      const user = db.findOne('user', (u) => u.id === review.userId);
      return {
        ...review,
        username: user ? user.username : "Unknown"
      };
    });
    
    res.send(reviewsWithUsers);
  } catch (e) {
    console.log(e.message);
    res.sendStatus(500);
  }
});

reviewsAPI.post("/venue/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const { rating, comment } = req.body;
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
    
    let venue = db.findOne('venue', (v) => v.id === venueId);
    
    if (!venue) {
      if (!API_KEY) {
        res.status(404).json({ error: 'Venue not found' });
        return;
      }
      
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${venueId}&key=${API_KEY}`;
        const googleResponse = await axios.get(googleUrl);
        
        if (googleResponse.data.status === 'OK') {
          const place = googleResponse.data.result;
          venue = await db.insertOne('venue', {
            id: place.place_id,
            name: place.name,
            location: place.formatted_address,
            description: place.types?.join(', ') || ''
          });
        } else {
          res.status(404).json({ error: 'Venue not found' });
          return;
        }
      } catch (googleError) {
        console.error('Error fetching venue from Google Places:', googleError);
        res.status(404).json({ error: 'Venue not found' });
        return;
      }
    }
    
    if (!rating || rating < 1 || rating > 5) {
      res.sendStatus(400);
      return;
    }
    
    const review = await db.insertOne('review', {
      venueId,
      userId: session.user,
      rating: Number(rating),
      comment: comment || ""
    });
    
    const stats = calculateVenueStats(venueId);
    res.status(201).send({
      ...review,
      rating: stats.rating,
      reviewCount: stats.reviewCount
    });
  } catch (e) {
    console.log(e.message);
    res.sendStatus(500);
  }
});

reviewsAPI.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
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
    
    const review = db.findOne('review', (r) => r.id === id);
    if (!review) {
      res.sendStatus(404);
      return;
    }
    
    if (review.userId !== session.user) {
      res.sendStatus(403);
      return;
    }
    
    const updates = {};
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        res.sendStatus(400);
        return;
      }
      updates.rating = Number(rating);
    }
    if (comment !== undefined) updates.comment = comment;
    
    await db.updateOne('review', id, updates);
    const updatedReview = db.findOne('review', (r) => r.id === id);
    const stats = calculateVenueStats(review.venueId);
    
    res.send({
      ...updatedReview,
      venueRating: stats.rating,
      venueReviewCount: stats.reviewCount
    });
  } catch (e) {
    console.log(e.message);
    res.sendStatus(500);
  }
});

reviewsAPI.delete("/:id", async (req, res) => {
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
    
    const review = db.findOne('review', (r) => r.id === id);
    if (!review) {
      res.sendStatus(404);
      return;
    }
    
    if (review.userId !== session.user) {
      res.sendStatus(403);
      return;
    }
    
    const venueId = review.venueId;
    await db.deleteOne('review', id);
    const stats = calculateVenueStats(venueId);
    
    res.send({
      rating: stats.rating,
      reviewCount: stats.reviewCount
    });
  } catch (e) {
    console.log(e.message);
    res.sendStatus(500);
  }
});

export default reviewsAPI;

