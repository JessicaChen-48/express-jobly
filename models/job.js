"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs */
class Job {
  /** Create a job posting */

  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
      `
    INSERT INTO jobs
    (title, salary, equity, company_handle)
    VALUES ($1, $2, $3, $4)
    RETURNING title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );

    const job = result.rows[0];

    return job;
  }

  static async findAll() {
    const jobsRes = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs 
      ORDER BY id`
    );

    return jobsRes.rows;
  }

  static async filter(params) {
    Job.checkCriteria(params);
    let { statement, values } = Job.createSearchSqlStatement(params);
  }

  /** HELPER FUNCTION FOR FILTER
   *
   * Checks the query parameters are either:
   * title, salary, or equity
   *
   * Throws BadRequestError if data is invalid
   */

  static checkCriteria(params) {
    const criteria = ["title", "minSalary", "hasEquity"];
    for (let key in params) {
      if (criteria.indexOf(key) < 0) {
        throw new BadRequestError("Invalid search criteria.");
      }
    }
    const { hasEquity } = params;
    if (hasEquity) {
      if (hasEquity !== "true" || hasEquity !== "false") {
        throw new BadRequestError("Invalid value for has equity");
      }
    }
  }

  static createSearchSqlStatement(params) {
    const { title, minSalary, hasEquity } = params;
    let sqlStatement = [];
    let sqlValues = [];

    if (title) {
      sqlStatement.push(`title ILIKE $${sqlStatement.length + 1}`);
      sqlValues.push(`%${title}%`);
    }
    if (minSalary) {
      sqlStatement.push(`salary >= $${sqlStatement.length + 1}`);
      sqlValues.push(parseInt(minSalary));
    }
    if (hasEquity === "true") {
      sqlStatement.push(`equity >= $${sqlStatement.length + 1}`);
      sqlValues.push(`0`);
    }

    let outStatement = sqlStatement.join(" AND ");

    return { statement: outStatement, values: sqlValues };
  }
}
