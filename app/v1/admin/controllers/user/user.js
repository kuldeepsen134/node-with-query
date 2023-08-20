// Import the Op (operators) from the Sequelize ORM (Object-Relational Mapping) library for handling database operations
const { Op } = require('sequelize')

/**
 * Import several models from the app's models module
 * User, Department, Company, Tag, TagRelationship, and Industry are all tables in the database, 
 * sequelize is the Sequelize instance that's been set up for the app's database, 
 * and DepartmentRelationship is another table model
 */
const { User, Company, TagRelationship, sequelize, Group, GroupRelationship } = require('app/models')

/**
 * Import several utility functions from the app's utils module
 * handleError and handleResponse are functions for handling errors and responses respectively,
 * strings is likely a module for handling string constants or string localization,
 * getPagination and getPagingResults are utility functions for handling pagination,
 * sortingData is a utility function for sorting data, 
 * and getEmployeeId is a function to generate or retrieve an employee id
 */
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData,
  getEmployeeId,
  prefixTableName
} = require('app/utils')

// Import helper functions handleSearchAndFilters and queryFilter from the helper module, 
// these functions assist with processing search and filter criteria
const { handleSearchAndFilters, queryFilter } = require('../helper')

// Import validation schemas for creating and updating users and updating profiles. 
// These schemas are likely used with a validation library like Joi to validate request data.
const { createUserSchema, updateUserSchema, updateProfileSchema } = require('./validator');

/**
 * Export an asynchronous function named `create`
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {
  // Validate the request body against the createUserSchema
  const { error } = createUserSchema.validate(req.body)

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    const {
      first_name,
      last_name,
      email,
      phone_number,
      status,
      role,
      department_id,
      address,
      country,
      state,
      city,
      postcode,
      gender
    } = req.body

    const trimmedFirstName = first_name?.trim();
    const trimmedLastName = last_name?.trim();
    const trimmedAddress = address?.trim();

    // Get the company_id from the request body if the role is 'super_administrator', otherwise get it from the request headers
    const company_id = req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id

    const data = {
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      email,
      phone_number,
      status,
      role,
      // Generate an employee_id using the first and last names and the company_id
      employee_id: await getEmployeeId({ fullName: `${first_name}` + ' ' + `${last_name}`, company_id: company_id }),
      address: trimmedAddress,
      country,
      state,
      city,
      postcode,
      company_id,
      gender
    }

    // Begin a database transaction
    await sequelize.transaction(async (t) => {
      // Create the new user in the database
      const user = await User.create(data, { transaction: t })

      await GroupRelationship.create({ group_id: department_id, user_id: user.dataValues.id })

      // Send a response back to the client with the newly created user data and a success message
      handleResponse(res, { data: user, message: strings.UserCreated })

    }).catch(error => {
      handleError(error, req, res)// Handles any errors that occur during the query
    })
  } catch (error) {
    handleError(error, req, res)// Handles any errors that occur in the try block
  }
}


/**
 * Export an asynchronous function named `findAll`
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = (req, res) => {
  try {
    // Retrieve page number and number of items per page from the request query parameters
    const { page, per_page } = req.query;

    // Use the getPagination function to calculate the limit and offset for the database query
    const { limit, offset } = getPagination(page, per_page);

    // Retrieve the sorting data from the request
    const sortResponse = sortingData(req);

    if (req.headers.role !== 'super_administrator') {
      req.query.filters.company_id = req.headers.company_id
    }

    // Execute a database query to find and count all users
    User.findAndCountAll(
      // Define the conditions for the query
      {
        where: {
          [Op.and]: [
            // Apply search and filters to specified columns
            handleSearchAndFilters(req, ['first_name', 'last_name', 'email', 'status', 'role', 'country', 'state', 'city']),
            // If a tag filter is provided in the request, apply it to the query
            req?.query?.filters?.tag_ids?.length > 0 && queryFilter(req)?.length > 10 && sequelize.literal(`
            EXISTS (
              SELECT 1
              FROM "${prefixTableName('groups_relationships')}" AS a
              WHERE a.user_id = "users".id
              AND a.group_id IN (${queryFilter(req)})
            )
            `),
            req?.query?.filters?.department_ids?.length > 0 && queryFilter(req)?.length > 10 && sequelize.literal(`
            EXISTS (
              SELECT 1
              FROM "${prefixTableName('groups_relationships')}" AS a
              WHERE a.user_id = "users".id
              AND a.group_id IN (${queryFilter(req)})
            )
            `)
          ]
        },
        // Sort the results based on the sort data retrieved earlier
        order: [[sortResponse.sortKey, sortResponse.sortValue]],

        // Limit the number of results and apply the offset calculated earlier
        limit, offset,

        // Specify the attributes to include and exclude in the data retrieved
        // Exclude 'otp' and include an array of 'tags'
        // 'tags' is an aggregate array obtained through a SQL query
        attributes: {
          exclude: ['otp'],
          include: [
            [
              sequelize.literal(`
              (
                SELECT array_agg( 
                  json_build_object(
                  'tag_id', b."group_id",
                  'user_id', b."user_id",
                  'title', c."title"
                ))
                FROM "${prefixTableName('users')}" AS a
                INNER JOIN "${prefixTableName('groups_relationships')}" AS b ON a.id = b.user_id
                INNER JOIN "${prefixTableName('groups')}" AS c ON c.id = b.group_id
                WHERE a.id = "users".id
                AND c."type" = 'tag'
              )
            `),
              'tags'
            ],
            [
              sequelize.literal(`
                (
                  SELECT array_agg( 
                    json_build_object(
                      'department_id', b."group_id",
                      'user_id', b."user_id",
                      'title', c."title"
                    )
                  )
                  FROM "${prefixTableName('users')}" AS a
                  INNER JOIN "${prefixTableName('groups_relationships')}" AS b ON a.id = b.user_id
                  INNER JOIN "${prefixTableName('groups')}" AS c ON c.id = b.group_id
                  WHERE a.id = "users".id
                  AND c."type" = 'department'
                )
              `),
              'departments'
            ]
          ]
        }
      }
    )
      // If the database query succeeds, send the response back to the client with the paginated data
      .then(async (data) => {
        handleResponse(res, { data: getPagingResults(data, page, limit) })
      }).catch(error => {
        handleError(error, req, res)// Handles any errors that occur during the query
      })
  } catch (error) {
    handleError(error, req, res)// Handles any errors that occur in the try block
  }
}

/**
 * Export an asynchronous function named `findOne`
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findOne = async (req, res) => {
  try {
    // Retrieve a specific user by primary key from the User model
    // The primary key is provided in the request parameters

    User.findByPk(req.params.id, {
      // Include associated Company and Department in the data retrieved
      include: [{ model: Company }],

      // Specify the attributes to include and exclude in the data retrieved
      // Exclude 'otp' and include an array of 'tag_ids' and 'groups' 
      // Each 'tag_ids' and 'groups' is an aggregate array obtained through a SQL query
      attributes: {
        exclude: ['otp'],
        include: [
          [
            sequelize.literal(`
            (
              SELECT array_agg( 
                json_build_object(
                'group_id', b."group_id",
                'user_id', b."user_id",
                'title', c."title",
                'type', c."type"
              ))
              FROM "${prefixTableName('users')}" AS a
              INNER JOIN "${prefixTableName('groups_relationships')}" AS b ON a.id = b.user_id
              INNER JOIN "${prefixTableName('groups')}" AS c ON c.id = b.group_id
              WHERE a.id = '${req.params.id}'
            )
          `),
            'groups'
          ],
          [
            sequelize.literal(`
            (
              SELECT array_agg( 
                json_build_object(
                'group_id', b."group_id",
                'user_id', b."user_id",
                'title', c."title"
              ))
              FROM "${prefixTableName('users')}" AS a
              INNER JOIN "${prefixTableName('groups_relationships')}" AS b ON a.id = b.user_id
              INNER JOIN "${prefixTableName('groups')}" AS c ON c.id = b.group_id
              WHERE a.id = '${req.params.id}'
              AND c."type" = 'department'
            )
          `),
            'departments'
          ]
        ]
      }
    })
      // If the database query succeeds, send the response back to the client with the data retrieved
      .then(async (data) => {
        const user = await User.findOne({ where: { id: req.headers.user_id, company_id: data.dataValues.company_id }, raw: true })
        if (req.headers.role === 'super_administrator' || user) {
          handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} })
        } else {
          handleError(strings.YouDoNotAccess, req, res)
        }
      }).catch(error => {
        handleError(error, req, res)// Handles any errors that occur during the query
      })
  } catch (error) {
    handleError(error, req, res)// Handles any errors that occur in the try block
  }
}

/**
 * Export an asynchronous function named `update`
 * @param req - The request object.
 * @param res - The response object.
 */
exports.update = async (req, res) => {

  // Validate the request body against the `updateUserSchema`
  // If the body doesn't match the schema, an error is returned
  const { error } = updateUserSchema.validate(req.body)

  // If validation returns an error, handle the error and end the request
  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    const user = await User.findOne({ where: { id: req.params.id, company_id: req.headers.company_id }, raw: true })

    if (req.headers.role === 'super_administrator' || user) {
      const {
        first_name,
        last_name,
        email,
        phone_number,
        status,
        role,
        address,
        country,
        state,
        city,
        postcode,
        gender,
        title
      } = req.body

      const trimmedFirstName = first_name?.trim();
      const trimmedLastName = last_name?.trim();
      const trimmedAddress = address?.trim();

      // Get the company_id from the request body if the role is 'super_administrator', otherwise get it from the request headers
      const company_id = req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id

      const data = {
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email,
        phone_number,
        status,
        role,
        address: trimmedAddress,
        country,
        state,
        city,
        postcode,
        company_id,
        gender,
        title
      }
      // Retrieve the user that matches the id in the request parameters
      const user = await User.findOne({ where: { id: req.params.id } })

      // If the user doesn't have an employee_id, generate one based on the user's name and company_id
      if (user?.dataValues?.employee_id === null) {
        req.body.employee_id = await getEmployeeId({ fullName: `${req.body.first_name}` + ' ' + `${req.body.last_name}`, company_id: company_id })
      }

      // Start a new transaction
      await sequelize.transaction(async (t) => {
        // Update the user that matches the id in the request parameters
        await User.update(data, { where: { id: req.params.id } }, { transaction: t }).then(async (data) => {

          // If the user is successfully updated, respond with a success message
          // If not, handle the 'User Not Found' error
          data == 1 ? handleResponse(res, { message: strings.UserUpdated }) :
            handleError(strings.UserNotFound, req, res)
        })

      }).catch(error => {
        handleError(error, req, res)// Handles any errors that occur during the query
      })
    } else {
      handleError(strings.YouDoNotAccess, req, res)
    }
  } catch (error) {
    handleError(error, req, res)// Handles any errors that occur in the try block
  }
}


/**
 * Export an asynchronous function named `delete`
 * @param req - The request object.
 * @param res - The response object.
 */
exports.delete = async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.params.id }, raw: true })

    if (user.is_deletable) {
      User.update({ status: 'deleted' }, { where: { id: req.params.id } })
        .then(data => {
          // If the user is successfully deleted, respond with a success message.
          // If not, handle the 'User Not Found' error.
          data == 1 ? handleResponse(res, { message: strings.UserDeleted }) :
            handleError(strings.UserNotFound, req, res)
        }).catch(err => {
          handleError(err, req, res)
        })
    } else {
      handleError('This user can\'t be deleted', req, res)
    }
  } catch (error) {
    handleError(error, req, res)// Handles any errors that occur in the try block
  }
}


/**
 * Export an asynchronous function named `me`
 * @param req - The request object.
 * @param res - The response object.
 */
exports.me = async (req, res) => {

  try {
    await User.findOne({
      where: { id: req.headers.user_id },
      include: [{
        model: Company,
        attributes: {
          include: [
            [
              sequelize.literal(`(
              SELECT array_agg(
                json_build_object(
                  'media_id', b."id",
                  'entity_id', b."entity_id",
                  'path', b."path",
                  'company_id', a."id"
                )
              )
              FROM 
                ${prefixTableName('companies')} AS a
              INNER JOIN 
                ${prefixTableName('media')} AS b ON a.id = b.entity_id
              WHERE 
                a.id = '5cfe5e21-e291-48d8-ac10-f934da9ce637'
              )`),'image'
            ]
          ]
        }
      }],
      attributes: {
        exclude: ['otp'],
        include: [
          [
            sequelize.literal(`(
            SELECT array_agg(
              json_build_object(
                'media_id', b."id",
                'entity_id', b."entity_id",
                'path', b."path"
              )
            )
            FROM "${prefixTableName('users')}" AS a
            INNER JOIN "${prefixTableName('media')}" AS b ON a.id = b.entity_id
            WHERE a.id = '${req.headers.user_id}'
          )`),
            'media'
          ]
        ]
      }
    })
      .then(async (data) => {
        handleResponse(res, { data: data })
      }).catch(error => {
        handleError(error, req, res)// Handles any errors that occur during the query
      })
  } catch (error) {
    handleError(error, req, res)// Handles any errors that occur in the try block
  }
}

/**
 * Export an asynchronous function named `profile`
 * @param req - The request object.
 * @param res - The response object.
 */
exports.profile = async (req, res) => {
  // Validate the request body against the `updateProfileSchema`.
  // If the body doesn't match the schema, an error is returned.
  const { error } = updateProfileSchema.validate(req.body)

  // If validation returns an error, handle the error and end the request.
  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    const {
      first_name,
      last_name,
      phone_number,
      address,
      country,
      state,
      city,
      postcode
    } = req.body

    const data = {
      first_name,
      last_name,
      phone_number,
      address,
      country,
      state,
      city,
      postcode
    }

    // Use Sequelize's `update` method to update the user's data in the database.
    // The `where` option is used to find the user with the ID sent in the request headers.
    User.update(data, { where: { id: req.headers.user_id } })
      .then(data => {
        handleResponse(res, { message: strings.UserUpdated })
      }).catch(error => {
        handleError(error, req, res)// Handles any errors that occur during the query
      })
  } catch (error) {
    handleError(error, req, res)// Handles any errors that occur in the try block
  }
}

const multer = require('multer');
const csv = require('fast-csv');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const company = require('../../../../models/company/company');

/**
 * Imports user data from a CSV file into the database.
 * @param req - The request object.
 * @param res - The response object.
 */
exports.importCSV = async (req, res) => {
  try {
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../../../CSV');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const fileName = `${uuidv4()}${ext}`;
        cb(null, fileName);
      }
    });

    const upload = multer({ storage: storage }).array('files');

    upload(req, res, async (error) => {
      if (error) {
        handleError(error, req, res);
        return;
      }
      
      const companyId = req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id;
      const filePath = req.body.url ? await downloadFile(req.body.url, req, res) : req.files[0].path;
      const stream = fs.createReadStream(filePath).pipe(csv.parse({ headers: true }));

      const users = [];
      stream.on('data', (data) => {
        const finalData = {
          email: data.Email,
          first_name: data.First_Name || null,
          last_name: data.Last_Name || null,
          phone_number: data.Phone_Number || null,
          title: data.Title || null,
          language: data.Language || null,
          gender: data.Gender,
          company_id: companyId,
          role: 'user',
          tags: data.Tags,
          department: data.Department
        };
        users.push(finalData);
      });

      stream.on('end', async () => {
        if (users.length > 0) {

          const existingUsers = await User.findAll({
            where: { email: { [Op.in]: users.map(user => user.email) }, company_id: companyId }, raw: true
          });

          const existingEmails = existingUsers.map(user => user.email);
          const newUsers = users.filter(user => !existingEmails.includes(user.email));

          const createUsers = await bulkUpsert(newUsers, req, res);
          const totalRecordsImported = users.length;
          const successfullyImportedRecords = createUsers.length;

          handleResponse(res, {
            message: `The total number of records imported is ${totalRecordsImported}, and the number of records that were successfully imported is ${successfullyImportedRecords}.`,
          });
        } else {
          handleError(strings.PleaseInsertOneRow, req, res)
        }
      });
      stream.on('error', (error) => {
        handleError(strings.SelectValid, req, res);
      });
    });
  } catch (error) {
    handleError(error, req, res);// Handles any errors that occur in the try block
  }
};

/**
 * Downloads a file from the specified URL and returns the path to the downloaded file.
 * @param {string} url - The URL of the file to download.
 * @returns {Promise<string>} - The path to the downloaded file.
 */
async function downloadFile(url, req, res) {
  try {
    const filePath = path.join(__dirname, '../../../../CSV', `${uuidv4()}.csv`);
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        const file = fs.createWriteStream(filePath);
        response.pipe(file);
        response.on('end', () => {
          resolve(filePath);
        });
        response.on('error', (error) => {
          reject(error);
          handleError(error, req, res)
        });
      });
    });
  } catch (error) {
    handleError(error, req, res)// Handles any errors that occur in the try block
  }
}

/**
 * Performs a bulk upsert of the specified users.
 * @param {Array<Object>} users - The users to upsert.
 */
async function bulkUpsert(users, req, res) {

  try {
    if (users?.length > 0) {
      const createdUsers = await User.bulkCreate(users, {
        ignoreDuplicates: true,
        returning: true
      }).catch((error) => {
        handleError(error, req, res)
      })

      let departments = []
      let tags = []

      for (let i = 0; i < createdUsers.length; i++) {
        const user = users[i];
        const createdUser = createdUsers[i];

        if (user?.department?.length === 36) {
          departments.push({ group_id: user?.department, user_id: createdUser.id })
        }

        user?.tags?.split(',').filter(value => {
          if (value.length === 36) {
            tags.push({ group_id: value.trim(), user_id: createdUser.id })
          }
        });
      }

      let array = [...departments, ...tags]

      if (array?.length > 0) {
        await GroupRelationship.bulkCreate(array, {
          ignoreDuplicates: true
        })
      }
      return createdUsers
    }
  } catch (error) {
    handleError(error, req, res)// Handles any errors that occur in the try block
  }

}