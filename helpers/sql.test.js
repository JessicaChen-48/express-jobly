"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const {sqlForPartialUpdate} = require("./sql.js");

const data = {firstName: 'Aliya',
              age:32 };
const jsToSql = {firstName: "first_name",
                age: "age"};

/********************* sqlForPartialUpdate */

describe("Create sql for partial update", function () {
    test("Creates proper sql statement", function () {
        let result = sqlForPartialUpdate(data, jsToSql);
        expect(result).toEqual({setCols:'"first_name"=$1, "age"=$2', values:['Aliya', 32]});
    })

    test("Throws error if no data provided in dataToUpdate", function () {
        try {
            sqlForPartialUpdate({}, jsToSql);
        } catch(err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }

    })
})
