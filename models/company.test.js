"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
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

describe("create a company", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    description: "New Description",
    numEmployees: 1,
    logoUrl: "http://new.img",
  };

  test("creating a company works", async function () {
    let company = await Company.create(newCompany);
    expect(company).toEqual(newCompany);

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'new'`);
    expect(result.rows).toEqual([
      {
        handle: "new",
        name: "New",
        description: "New Description",
        num_employees: 1,
        logo_url: "http://new.img",
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Company.create(newCompany);
      await Company.create(newCompany);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll companies", function () {
  test("findAll companies works: no filter", async function () {
    let companies = await Company.findAll();
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
      {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
      {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      },
    ]);
  });
});


/************************************** filter */

describe("filter companies", function () {
  test("find companies that match one query parameter successfully", async function () {
    let companies = await Company.filter({minEmployees:3});
    expect(companies.length).toEqual(1);
    expect(companies[0]).toEqual({
      handle: "c3",
      name: "C3",
      description: "Desc3",
      numEmployees: 3,
      logoUrl: "http://c3.img",
    });
  });

  test("find companies that match multiple query params successfully", async function () {
    let companies = await Company.filter({maxEmployees:2, name:"C2"});
    expect(companies.length).toEqual(1);
    expect(companies[0]).toEqual({
      handle: "c2",
      name: "C2",
      description: "Desc2",
      numEmployees: 2,
      logoUrl: "http://c2.img"
    });
  });

  test("bad request if incorrect parameter given", async function () {
    try {
      await Company.filter({coffeeMachines:2, name:"C2"});
    }catch(error){
      expect(error instanceof BadRequestError).toBeTruthy();
    }
  });

  test("bad request if min > max", async function () {
    try {
      await Company.filter({maxEmployees: 2, minEmployees: 3});
    }catch(error){
      expect(error instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** get */

describe("get a company", function () {
  test("get a company works", async function () {
    let company = await Company.get("c1");
    expect(company).toEqual({
      handle: "c1",
      name: "C1",
      description: "Desc1",
      numEmployees: 1,
      logoUrl: "http://c1.img",
    });
  });

  test("not found if no such company", async function () {
    try {
      await Company.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update a company", function () {
  const updateData = {
    name: "New",
    description: "New Description",
    numEmployees: 10,
    logoUrl: "http://new.img",
  };

  test("update a company works", async function () {
    let company = await Company.update("c1", updateData);
    expect(company).toEqual({
      handle: "c1",
      ...updateData,
    });

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: 10,
      logo_url: "http://new.img",
    }]);
  });

  test("update company works: null fields", async function () {
    const updateDataSetNulls = {
      name: "New",
      description: "New Description",
      numEmployees: null,
      logoUrl: null,
    };

    let company = await Company.update("c1", updateDataSetNulls);
    expect(company).toEqual({
      handle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: null,
      logo_url: null,
    }]);
  });

  test("not found if no such company", async function () {
    try {
      await Company.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Company.update("c1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove a company", function () {
  test("remove a company works", async function () {
    await Company.remove("c1");
    const res = await db.query(
        "SELECT handle FROM companies WHERE handle='c1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Company.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
