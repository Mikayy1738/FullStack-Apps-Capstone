import { Router } from 'express';
import userAPI from './user.js';
import venuesAPI from './venues.js';
import reviewsAPI from './reviews.js';
import googlePlacesAPI from './googlePlaces.js';

const api = Router()

api.use('/user', userAPI)
api.use('/venues', venuesAPI)
api.use('/reviews', reviewsAPI)
api.use('/places', googlePlacesAPI)

export default api;