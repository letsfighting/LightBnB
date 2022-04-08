const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require("pg");

const pool = new Pool({
  user: "labber",
  password: "123",
  host: "localhost",
  database: "lightbnb",
});

/* to test connection
pool.query(`SELECT title FROM properties LIMIT 10;`).then((response) => {
  console.log(response);
});
*/

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const values = [`%${email}%`];

  return pool
    .query(`SELECT * FROM users WHERE email LIKE $1`, values)
    .then((result) => {
      console.log("result: ", result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });

  /* pre-refactor
  let user;
  for (const userId in users) {
    user = users[userId];
    console.log("users: ", user);
    if (user.email.toLowerCase() === email.toLowerCase()) {
      console.log("user: ", user);
      break;
    } else {
      user = null;
    }
  }
  return Promise.resolve(user);
  */
};

exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => {
      console.log("result: ", result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });

  /* pre refactor
  console.log("getUserWithId: ", Promise.resolve(users[id]));
  return Promise.resolve(users[id]);
  */
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  console.log("addUser: ", user);
  /*
  const userId = Object.keys(users).length + 1;
  user.id = userId;
  users[userId] = user;
  return Promise.resolve(user);
  */
  const uname = user.name;
  const email = user.email;
  const pw = user.password;
  const values = [uname, email, pw];

  return pool
    .query(
      `INSERT INTO users (name, email, password) VALUES 
($1, $2, $3) RETURNING *;`,
      values
    )
    .then((result) => {
      console.log("result: ", result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  console.log("guest_id: ", guest_id);
  const values = [guest_id, limit];

  return pool
    .query(
      `SELECT * 
FROM properties
JOIN reservations ON property_id = properties.id
JOIN users ON users.id = guest_id
WHERE guest_id = $1
LIMIT $2;`,
      values
    )
    .then((result) => {
      console.log("result: ", result.rows);
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

/*pre-refactoring
const getAllProperties = function (options, limit = 10) {
  const limitedProperties = {};
  for (let i = 1; i <= limit; i++) {
    limitedProperties[i] = properties[i];
  }
  return Promise.resolve(limitedProperties);
};
*/
const getAllProperties = (options, limit = 10) => {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  let tracker = 0;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length}
    `;
    tracker++;
  }

  /*
  if (options.owner_id) {
    if (tracker === 0) {
      queryParams.push(`${options.owner_id}`);
      queryString += `WHERE owner_id = $${queryParams.length}
      `;
      tracker++;
    } else {
      queryParams.push(`${options.owner_id}`);
      queryString += `AND owner_id = $${queryParams.length}
      `;
    }
  }*/

  if (options.minimum_price_per_night) {
    if (tracker === 0) {
      queryParams.push(`${options.minimum_price_per_night}`);
      queryString += `WHERE cost_per_night > $${queryParams.length}
      `;
      tracker++;
    } else {
      queryParams.push(`${options.minimum_price_per_night}`);
      queryString += `AND cost_per_night > $${queryParams.length}
      `;
    }
  }

  if (options.maximum_price_per_night) {
    if (tracker === 0) {
      queryParams.push(`${options.maximum_price_per_night}`);
      queryString += `WHERE cost_per_night < $${queryParams.length}
      `;
      tracker++;
    } else {
      queryParams.push(`${options.maximum_price_per_night}`);
      queryString += `AND cost_per_night < $${queryParams.length}
      `;
    }
  }

  console.log("options: ", options);

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `GROUP BY properties.id
    HAVING avg(property_reviews.rating) >= $${queryParams.length}
      `;
  } else {
    queryString += `GROUP BY properties.id`;
  }

  // 4
  console.log("limit: ", limit);
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  console.log("string/params: ", queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
};

exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};
exports.addProperty = addProperty;
