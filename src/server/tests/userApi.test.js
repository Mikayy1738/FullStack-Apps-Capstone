import {beforeAll, expect, test, afterAll} from 'vitest';
import request from 'supertest';
import fs from 'fs/promises'
import makeApp from '../app';
import bcrypt from 'bcrypt';

let app, server, user;

const userData = {
  "username": "username",
  "email": "email@gmail.com",
  "password": "password"
};

const FILE_LOCATION = "./src/server/tests/dbFiles/"

beforeAll(async () => {
  app = makeApp(["user", "session"], FILE_LOCATION);
  server = app.listen(8080);
})

afterAll(async () => {
  server.close();
  await fs.unlink(`${FILE_LOCATION}user.txt`)
  await fs.unlink(`${FILE_LOCATION}session.txt`)
})

test("POST api/user/create", async() => {

  await request(app).post(`/api/user/create`).send(userData)
    .expect(201)

  user = JSON.parse(await fs.readFile(FILE_LOCATION + "user.txt"))[1];
  const {username, email, password} = user;

  expect(username).toEqual(userData.username);
  expect(email).toEqual(userData.email);
  expect(password !== userData.password).toBeTruthy();
  expect(await bcrypt.compare(userData.password, password)).toBeTruthy();
});

test("POST api/user/login", async() => {
  const res = await request(app).post('/api/user/login').send(userData)
  console.log(res.body);
  expect(res.header["set-cookie"][0].includes("VenueReviewSessionID=")).toBeTruthy();
  expect(res.body.username).toEqual(userData.username);
  expect(res.body.email).toEqual(userData.email);
  expect(res.body.id).toEqual(user.id);
  expect(res.body.password).toBeUndefined()
})