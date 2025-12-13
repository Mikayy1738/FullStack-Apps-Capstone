# Backend Design — capstone-4

**Team repo:**https://github.com/AlexPHebert2000/FullStack-Apps-Capstone
**Project (v2) board:** <URL> (public or shared with instructors)  

## Deliverables for this phase
- Services
- Routes/endpoints
- API
- Tooling and Auth
## Summary (what we produced)
- We have planned an API design to facilitate data management between front end and database and google maps API intergration.

## Evidence / Artifacts
- Endpoints / API
  - googlePlaces
    - GET /search body:{userQuery: string}: sends search query to Google Maps API, forwards response
  - tag
    - GET /:id : finds tag by id and responds with the tag with list of tagged venues
    - POST /create body: {name: string}: creates a new tag, responds with the new tag's id
    - PUT /add body: {venueID: string, tagID: string} : connects tag to a venue, no response data
    - PATCH /remove body: {venueID: string, tagID: string} : disconnects tag from venue, responds with updated venue
    - POST /upsert body: {venueID: string, tagID: string} : Creates tag if it doesn't exists and then connects the tag to a venue, responds with the new venue
    - GET /list : responds with a list of all tags
  - user
    - POST /create body: {password: string, username: string, email: string} : creates new user and session, responds with user information and session cookie
    - POST /login body: {email: string, password: string} : validates user credientals and responds with user data and session cookie
    - GET /me : uses session cookie to respond with user information
    - POST /logout : deletes session and session cookie
  - venue
    - GET /?search : uses Google Maps API to search then modifies response with data from database including tags, responds with results
    - GET /:id : uses Google Maps API to search then modifies response with data from database including tags, responds with results 