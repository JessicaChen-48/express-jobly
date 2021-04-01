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
    RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );

    const job = result.rows[0];

    return job;
  }

  /** Gets all jobs.
   *
   * Returns [{id, title, salary, equity, companyHandle}, ...]
   */
  static async findAll() {
    const jobsRes = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs
      ORDER BY id`
    );

    return jobsRes.rows;
  }

  /** Finds jobs that meet search parameters
   * Throws error if not title, salary, or equity
   * Returns [{id, title, salary, equity, companyHandle}, ...]
   */
  static async filter(params) {
    Job.checkCriteria(params);
    let { statement, values } = Job.createSearchSqlStatement(params);

    const querySql = `SELECT id,
                             title,
                             salary,
                             equity,
                             company_handle AS "companyHandle"
                      FROM jobs
                      WHERE ${statement}`
    const result = await db.query(querySql, values);
    return result.rows;
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
      if (hasEquity !== "true" && hasEquity !== "false") {
        throw new BadRequestError("Invalid value for has equity");
      }
    }
  }

  /** HELPER FUNCTION FOR FILTER
   *
   * Creates template for SQL query to search jobs with valid filter
   *
   * Returns {statement: "column = $1 AND column = $2", values: [values, ...] }
   *
   */
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
    if (hasEquity === "true"  ) {
      sqlStatement.push(`equity > $${sqlStatement.length + 1}`);
      sqlValues.push(`0`);
    }

    let outStatement = sqlStatement.join(" AND ");

    return { statement: outStatement, values: sqlValues };
  }

  /** Given a job id, return data about job
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */
  static async get(id) {
    const result = await db.query(
        `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`,
          [id]
    );

    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with id: ${id}.`);

    return job;

  }

  /** Update job data with `data`
   *
   * Can be partial update
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */
  static async update(id, data) {
    const {setCols, values } = sqlForPartialUpdate(data);
    const idVarIdx = "$" + (values.length + 1);
    const querySql = `UPDATE jobs
                        SET ${setCols}
                        WHERE id = ${idVarIdx}
                        RETURNING id,
                                  title,
                                  salary,
                                  equity,
                                  company_handle AS "companyHandle"`
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if(!job) throw new NotFoundError(`No job with id: ${id}.`);
    return job;
  }

  /** Delete given job from database; returns undefined
   *
   * Throws NotFoundError if company not found.
  */
  static async remove(id) {
    const result = await db.query(
          `DELETE
          FROM jobs
          WHERE id = $1
          RETURNING id`,
          [id]);
    const job = result.rows[0]

    if(!job) throw new NotFoundError(`No job with id: ${id}.`);
  }
}

module.exports = Job;