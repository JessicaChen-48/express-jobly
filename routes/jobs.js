"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");

const router = new express.Router();

/** POST / { job } => { job }
 * 
 * job should be { id, title, salary, equity, companyHandle }
 * 
 * Returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: admin
 * 
 * This makes a job
*/

router.post("/", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, jobNewSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.create(req.body);
  return res.status(201).json({ job });
});

/** GET /  =>
 *   { jobs: [ { id, title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - title (case insensitive, partial matches)
 * - minSalary
 * - hasEquity
 *
 * Authorization required: none
 * Get all jobs
 */

router.get("/", async function (req, res, next) {
  let jobs;

  if (Object.keys(req.query).length) {
    jobs = await Job.filter(req.query);
  } else {
    jobs = await Job.findAll();
  }
  return res.json({ jobs });
});


/** GET /[id]  =>  { job }
 *
 *  job is { id, title, salary, equity, companyHandle }
 *
 * Authorization required: none
 * Get info about one job
 */

router.get("/:id", async function (req, res, next) {
  const job = await Job.get(req.params.id);
  return res.json({ job });
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 *
 * Update one job's information
 */

router.patch("/:id", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, jobUpdateSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.update(req.params.id, req.body);
  return res.json({ job });
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: admin
 *
 * Delete a job
 */

router.delete("/:id", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  await Job.remove(req.params.id);
  return res.json({ deleted: req.params.id });
});


module.exports = router;
