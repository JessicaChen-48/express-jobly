"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn, ensureAdmin, ensureCorrectUserOrAdmin } = require("../middleware/auth");
const { BadRequestError, UnauthorizedError } = require("../expressError");
const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");
const updateApplicationSchema = require("../schemas/updateApplication.json");
const generator = require('generate-password');

const router = express.Router();


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: login
 *
 * This route is for admins creating users, the rest are for normal users
 **/

router.post("/", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, userNewSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }
  const password = generator.generate({
    length: 10,
    numbers: true
  })
  req.body.password = password;

  const user = await User.register(req.body);
  const token = createToken(user);
  return res.status(201).json({ user, token });
});


/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: login
 **/

router.get("/", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  const users = await User.findAll();
  return res.json({ users });
});


/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin }
 *
 * Authorization required: login
 **/

router.get("/:username", ensureLoggedIn, ensureCorrectUserOrAdmin, async function (req, res, next) {
  const user = await User.get(req.params.username);
  return res.json({ user });
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: login
 **/


router.patch("/:username", ensureLoggedIn, ensureCorrectUserOrAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, userUpdateSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const user = await User.update(req.params.username, req.body);
  return res.json({ user });
});

/** Allow user to apply for job
 *
 * POST /[username]/jobs/[id] => {applied: jobId}
 *
 * Authorization: admin or user
*/


router.post("/:username/jobs/:id", ensureLoggedIn, ensureCorrectUserOrAdmin, async function (req, res, next) {

  const application = await User.applyForJob(req.params.username, req.params.id);

  return res.json({applied: application.jobId});
});

/** Allow admin to update job current state for users
 *
 * PATCH /[username]/jobs/[id] {newState} => {username, jobId, currentState}
 *
 * Authorization required: admin
*/

router.patch("/:username/jobs/:id", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, updateApplicationSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const application = await User.updateJobApplication(req.params.username, req.params.id, req.body.newState);
  return res.json({application})
});


/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: admin or user
 **/

router.delete("/:username", ensureLoggedIn, ensureCorrectUserOrAdmin, async function (req, res, next) {
  await User.remove(req.params.username);
  return res.json({ deleted: req.params.username });
});


module.exports = router;
