"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const Job = require("./job");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

/** Related functions for users. */

class User {
  /** authenticate user with username, password.
   *
   * Returns { username, first_name, last_name, email, is_admin }
   *
   * Throws UnauthorizedError is user not found or wrong password.
   *
   * used in auth.js route
   **/

  static async authenticate(username, password) {
    // try to find the user first
    const result = await db.query(
      `SELECT username,
                  password,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (user) {
      // compare hashed password to a new hash from password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }

    throw new UnauthorizedError("Invalid username/password");
  }

  /** Register user with data.
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws BadRequestError on duplicates.
   **/

  static async register({
    username,
    password,
    firstName,
    lastName,
    email,
    isAdmin,
  }) {
    const duplicateCheck = await db.query(
      `SELECT username
           FROM users
           WHERE username = $1`,
      [username]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate username: ${username}`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users
           (username,
            password,
            first_name,
            last_name,
            email,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
      [username, hashedPassword, firstName, lastName, email, isAdmin]
    );

    const user = result.rows[0];

    return user;
  }

  /** Find all users.
   *
   * Returns [{ username, first_name, last_name, email, is_admin }, ...]
   **/

  static async findAll() {
    const result = await db.query(
      `SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           ORDER BY username`
    );

    return result.rows;
  }

  /** Given a username, return data about user.
   *
   * Returns { username, first_name, last_name, is_admin, jobs }
   *   where jobs is { id, title, company_handle, company_name, state }
   *
   * Throws NotFoundError if user not found.
   **/

  static async get(username) {
    const userRes = await db.query(
      `SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
      [username]
    );
    
    const user = userRes.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    const jobs = await db.query(
      `SELECT job_id AS "jobId"
        FROM applications
        WHERE username = $1`,
      [username]
    );
    
    if (jobs.rows.length > 0) {
      const jobIds = jobs.rows.map(job => job.jobId);
      user.jobs = jobIds;
    }

    return user;
  }

  /** Let a user or admin apply for a job 
   * 
   * Takes in username and jobId
   * 
   * Returns { username: username, jobId: job_id, currentState: applied }
  */
  static async applyForJob(username, jobId) {
    const user = await User.get(username);
    const job = await Job.get(jobId);

    if (!user) {
      throw new NotFoundError("Username not found");
    }
    if (!job) {
      throw new NotFoundError("Job not found");
    }

    const duplicateCheck = await db.query(
      `SELECT username, job_id
       FROM applications
       WHERE username = $1 AND job_id=$2`,
      [username, parseInt(jobId)]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(
        `Duplicate application: ${username} for job id ${jobId}`
      );

    const res = await db.query(
      `INSERT INTO  applications (username, job_id, current_state)
      VALUES ($1, $2, 'applied')
      RETURNING username, job_id AS "jobId", current_state AS "currentState"`,
      [username, parseInt(jobId)]
    );

    const application = res.rows[0];

    return application;
  }

  /** Allows admin to update job application currentState
   * 
   * Takes in username, jobId, and new state
   * 
   * Returns {username, jobId, currentState}
  */

  static async updateJobApplication(username, jobId, newState) {
    const result = await db.query(
        `SELECT username, job_id, current_state 
        FROM applications
        WHERE username=$1 AND job_id=$2`, [username, jobId]
    );
    const application = result.rows[0];

    if (!application) {
      throw new NotFoundError("Application not found");
    }

    const updateRes = await db.query(
      `UPDATE applications
      SET current_state=$1
      RETURNING username, job_id AS "jobId", current_state AS "currentState"`, [newState]
    );

    const updatedApp = updateRes.rows[0];

    return updatedApp;
  }

  /** Update user data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include:
   *   { firstName, lastName, password, email, isAdmin }
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws NotFoundError if not found.
   *
   * WARNING: this function can set a new password or make a user an admin.
   * Callers of this function must be certain they have validated inputs to this
   * or a serious security risks are opened.
   */

  static async update(username, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    const { setCols, values } = sqlForPartialUpdate(data, {
      firstName: "first_name",
      lastName: "last_name",
      isAdmin: "is_admin",
    });
    const usernameVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE users
                      SET ${setCols}
                      WHERE username = ${usernameVarIdx}
                      RETURNING username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                is_admin AS "isAdmin"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    delete user.password;
    return user;
  }

  /** Delete given user from database; returns undefined. */

  static async remove(username) {
    let result = await db.query(
      `DELETE
           FROM users
           WHERE username = $1
           RETURNING username`,
      [username]
    );
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);
  }
}

module.exports = User;
