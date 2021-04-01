"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 11,
    equity: 0.01,
    companyHandle: "c1"
  };

  test("ok for admins", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "new",
        salary: 11,
        equity: "0.01",
        companyHandle: "c1"
      },
    });
  });

  test("unauth for users", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });


  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new"
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new",
          salary: -11,
          equity: 1.01,
          companyHandle: 'c1'
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {

  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
              id: expect.any(Number),
              title: "j1",
              salary: 1,
              equity: "0.001",
              companyHandle: "c1"
            },
            {
              id: expect.any(Number),
              title: "j2",
              salary: 2,
              equity: "0",
              companyHandle: "c2"
            }
          ]
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });

  test("search and filter on get requests with one query param", async function () {
    const resp = await request(app)
                  .get("/jobs?title=j1");
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs:
      [
        {
          id: expect.any(Number),
          title: "j1",
          salary: 1,
          equity: "0.001",
          companyHandle: "c1"
        }
      ]
    });
  });

  test("search and filter on get requests with multiple query params", async function () {
    const resp = await request(app)
                  .get("/jobs?hasEquity=true&minSalary=1");
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs:
      [
        {
          id: expect.any(Number),
          title: "j1",
          salary: 1,
          equity: "0.001",
          companyHandle: "c1"
        }
      ]
    });
  });

  test("query parameter contains not valid search keyword", async function () {
    const resp = await request(app)
                .get("/jobs?vacationDays=300");
    expect(resp.statusCode).toEqual(400);
  });

  test("hasEquity not Boolean errors", async function () {
    const resp = await request(app)
                .get("/jobs?hasEquity=ofcourseduh");
    expect(resp.statusCode).toEqual(400);
  });

});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {

  test("works for anon", async function () {

    const allJobs = await request(app).get("/jobs")
    const job = allJobs.body.jobs[0]

    const resp = await request(app).get(`/jobs/${job.id}`);
    expect(resp.body).toEqual({job})
  });

  test("bad request for string id", async function () {
    const resp = await request(app).get(`/jobs/none`);
    expect(resp.statusCode).toEqual(400);
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404);
  });

});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admins", async function () {
    const allJobs = await request(app).get("/jobs")
    const {id} = allJobs.body.jobs[0]
    const resp = await request(app)
        .patch(`/jobs/${id}`)
        .send({
          title: "j1-new",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({
      job: {
        ...allJobs.body.jobs[0],
        title: "j1-new"
      },
    });
  });

  test("unauth for users", async function () {
    const allJobs = await request(app).get("/jobs")
    const { id } = allJobs.body.jobs[0]
    const resp = await request(app)
        .patch(`/jobs/${id}`)
        .send({
          title: "j1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const allJobs = await request(app).get("/jobs")
    const { id } = allJobs.body.jobs[0]
    const resp = await request(app)
        .patch(`/jobs/${id}`)
        .send({
          title: "j1-new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
        .patch(`/jobs/0`)
        .send({
          title: "new nope",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on string id", async function () {
    const resp = await request(app)
        .patch(`/jobs/nope`)
        .send({
          title: "new nope",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on handle change attempt", async function () {
    const allJobs = await request(app).get("/jobs")
    const { id } = allJobs.body.jobs[0]
    const resp = await request(app)
        .patch(`/jobs/${id}`)
        .send({
          companyHandle: "c1-new",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const allJobs = await request(app).get("/jobs")
    const { id } = allJobs.body.jobs[0]
    const resp = await request(app)
        .patch(`/jobs/${id}`)
        .send({
          equity: 2.0,
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin", async function () {
    const allJobs = await request(app).get("/jobs")
    const { id } = allJobs.body.jobs[0]
    const resp = await request(app)
        .delete(`/jobs/${id}`)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({ deleted: `${id}`});
  });

  test("unauth for user", async function () {
    const allJobs = await request(app).get("/jobs")
    const { id } = allJobs.body.jobs[0]
    const resp = await request(app)
        .delete(`/jobs/${id}`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const allJobs = await request(app).get("/jobs")
    const { id } = allJobs.body.jobs[0]
    const resp = await request(app)
        .delete(`/jobs/${id}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
        .delete(`/jobs/0`)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request for string id", async function () {
    const resp = await request(app)
        .delete(`/jobs/nope`)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});
