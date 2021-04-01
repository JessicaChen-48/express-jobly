"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create a job", function () {
  const newJob = {
    title: "new",
    salary: 11,
    equity: 0.01,
    companyHandle: 'c1'
  };

  test("creating a job works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({
      id: expect.any(Number),
      title: "new",
      salary: 11,
      equity: "0.01",
      companyHandle: 'c1'
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE title = 'new'`);
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "new",
        salary: 11,
        equity: "0.01",
        companyHandle: 'c1'
      },
    ]);
  });

  test("create job with invalid company handle errors", async function () {
    try {
      await Job.create({
        title: "new",
        salary: 11,
        equity: 0.01,
        companyHandle: 'c123'
      });
    } catch (error) {
      expect(error instanceof BadRequestError).toBeTruthy();
    }
  });

});

/************************************** findAll */

describe("findAll jobs", function () {
  test("findAll jobs works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        equity: null,
        salary: 1,
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "j2",
        equity: "0",
        salary: 2,
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "j3",
        equity: "0.003",
        salary: 3,
        companyHandle: "c3",
      },
    ]);
  });
});

/************************************** filter */

describe("filter jobs", function () {
  test("find jobs that match one query parameter successfully", async function () {
    let jobs = await Job.filter({ minSalary: 3 });
    expect(jobs.length).toEqual(1);
    expect(jobs[0]).toEqual({
      id: expect.any(Number),
      title: "j3",
      equity: "0.003",
      salary: 3,
      companyHandle: "c3"
    });
  });

  test("find jobs that match multiple query params successfully", async function () {
    let jobs = await Job.filter({ minSalary: 2, title: "j2" });
    expect(jobs.length).toEqual(1);
    expect(jobs[0]).toEqual({
      id: expect.any(Number),
      title: "j2",
      equity: "0",
      salary: 2,
      companyHandle: "c2"
    });
  });

  test("find jobs on equity filter properly", async function () {
    let jobs = await Job.filter({ hasEquity: "true" });
    expect(jobs.length).toEqual(1);
    expect(jobs[0]).toEqual({
      id: expect.any(Number),
      title: "j3",
      equity: "0.003",
      salary: 3,
      companyHandle: "c3"
    })
  });

  test("bad request if incorrect parameter given", async function () {
    try {
      await Job.filter({ coffeeMachines: 2, title: "j2" });
    } catch (error) {
      expect(error instanceof BadRequestError).toBeTruthy();
    }
  });
});
  /************************************** update */

describe("update a job", function () {
  const updateData = {
    title: "New",
    salary: 1,
    equity: 1,
  };

  test("update a job works", async function () {
    const allJobs = await db.query(
      `SELECT id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"
      FROM jobs`)
    const job = allJobs.rows[0]
    let changedJob = await Job.update(job.id, updateData);
    expect(changedJob).toEqual({
      id: job.id,
      title: "New",
      salary: 1,
      equity: "1",
      companyHandle: job.companyHandle
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = ${job.id}`);
    expect(result.rows).toEqual([{
      id: job.id,
      title: "New",
      salary: 1,
      equity: "1",
      companyHandle: job.companyHandle
    }]);
  });

  test("update job works: null fields", async function () {
    const updateDataSetNulls = {
      title: "New",
      salary: null,
      equity: null,
    };

    const allJobs = await db.query(
      `SELECT id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"
      FROM jobs`)
    const job = allJobs.rows[0]
    let changedJob = await Job.update(job.id, updateDataSetNulls);

    expect(changedJob).toEqual({
      id: job.id,
      companyHandle: job.companyHandle,
      ...updateDataSetNulls,
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = ${job.id}`);
    expect(result.rows).toEqual([{
      id: job.id,
      title: "New",
      salary: null,
      equity: null,
      companyHandle: job.companyHandle
    }]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(0, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request if string id", async function () {
    try {
      await Job.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      const allJobs = await db.query(
        `SELECT id
          FROM jobs`)
      const {id} = allJobs.rows[0]
      await Job.update(id, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

});


/************************************** remove */

describe("remove a job", function () {
  test("remove a job works", async function () {
    const allJobs = await db.query(
      `SELECT id
        FROM jobs`)
    const {id} = allJobs.rows[0]
    await Job.remove(id);
    const res = await db.query(
        `SELECT id FROM jobs WHERE id=${id}`);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove("0");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request if id is string", async function () {
    try {
      await Job.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});
