

USERS TABLE ---> USER_TECH  < ------- > TECHNOLOGIES < --- > TECH_JOBS < ----------- > JOBS

username    --> username, tech_id  <--->  tech_id -----------> tech_id, job_id <------>  job_id



SELECT tech_id
FROM user_tech
WHERE username = 1;


result = await db.query (
    `SELECT tech_id AS techId
    FROM user_tech
    WHERE username = $1` , [username]
)

const techIds = result.rows
    [{techId: 1}, {techId:2}, ...]


techIds.map(tech => tech.techId)

[1, 2, 3]


SELECT job_id
FROM job_tech
WHERE tech_id IN (tech_ids)

SELECT job_id
FROM job_tech
WHERE tech_id IN ($1)

[{jobId:1}, ...]

[[...tech_ids]]
(1, 2, 3)

