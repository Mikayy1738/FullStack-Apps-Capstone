import { Router } from 'express';
import axios from 'axios';

const googlePlacesAPI = Router();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

googlePlacesAPI.get('/search', async (req, res) => {
    try {
        const userQuery = req.query.query; 

        if (!userQuery) {
            res.status(400).json({ error: 'Query parameter is required' });
            return;
        }

        if (!API_KEY) {
            console.error('GOOGLE_PLACES_API_KEY is not set');
            res.status(500).json({ error: 'API key not configured' });
            return;
        }

        const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(userQuery)}&key=${API_KEY}`;

        const response = await axios.get(googleUrl);

        res.json(response.data);

    } catch (error) {
        console.error('Error fetching places:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

export default googlePlacesAPI;