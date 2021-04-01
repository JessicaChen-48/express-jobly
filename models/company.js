"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /**Finds companies that meet search parameters.
   *  Throws error if not name, minEmployees, or maxEmployees
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]*/
  static async filter(params) {
    Company.checkCriteria(params);
    let {statement, values} = Company.createSearchSqlStatement(params);

    const querySql = `SELECT handle,
                             name,
                             description,
                             num_employees AS "numEmployees",
                             logo_url AS "logoUrl"
                        FROM companies
                        WHERE ${statement}
                      `
    const result = await db.query(querySql, values);
    return result.rows;
  }

  /** HELPER FUNCTION FOR FILTER
   *
   * Checks the query parameters are either:
   * name, minEmployees, or maxEmployees
   * Also checks that minEmployees < maxEmployees
   * Throws BadRequestError if data is invalid
  */

  static checkCriteria(params) {
    const criteria = ["name", "minEmployees", "maxEmployees"];
    const {minEmployees, maxEmployees} = params;
    for (let key in params) {
      if (criteria.indexOf(key) < 0) {
        throw new BadRequestError("Invalid search criteria.");
      }
    }
    if (minEmployees && maxEmployees) {
      if (minEmployees > maxEmployees) {
        throw new BadRequestError("Max employees must be greater than min employees");
      }
    }
  }

  /** HELPER FUNCTION FOR FILTER
   *
   * Gets the query params
   * Creates template for SQL query to search companies with valid filter
   *
   * Sample return:
   *   {statement: 'column = $1 AND column =$2', values: [value1, value2]}
  */

  static createSearchSqlStatement(params) {
    const {name, minEmployees, maxEmployees} = params;
    let sqlStatement = [];
    let sqlValues = [];

    if (minEmployees) {
      sqlStatement.push(`num_employees >= $${sqlStatement.length +1}`);
      sqlValues.push(parseInt(minEmployees));
    }
    if (maxEmployees) {
      sqlStatement.push(`num_employees <= $${sqlStatement.length +1}`);
      sqlValues.push(parseInt(maxEmployees));
    }
    if (name) {
      sqlStatement.push(`name ILIKE $${sqlStatement.length +1}`);
      sqlValues.push(`%${name}%`);
    }

    let outStatement = sqlStatement.join(" AND ");

    return {statement: outStatement, values: sqlValues};

  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobRes = await db.query(
      `SELECT id, title, salary, equity
        FROM jobs
        WHERE company_handle = $1`,
        [handle]);

    const jobs = jobRes.rows
    if(jobs.length > 0) {
      company.jobs = jobs;
    }

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies
                      SET ${setCols}
                      WHERE handle = ${handleVarIdx}
                      RETURNING handle,
                                name,
                                description,
                                num_employees AS "numEmployees",
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
