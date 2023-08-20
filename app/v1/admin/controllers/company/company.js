// Import 'Op' object provides operators for Sequelize queries
const { Op } = require('sequelize')

//Import models database
const { Company, Industry, User, sequelize, Group } = require('app/models')

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData,
  getCompanyId,
  prefixTableName
} = require('app/utils')

//Import handleSearchAndFilters function
const { handleSearchAndFilters } = require('../helper')

//Import validation schemas
const { createCompanySchema, updateCompanySchema } = require('./validator')

/**
 * Export an asynchronous function named `create`
 * Create company
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {
  // Validate the request body using the createCompanySchema
  const { error } = createCompanySchema.validate(req.body)

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    // Destructure the required fields from the request body
    const {
      company_name,
      company_email,
      phone_number,
      industry_id,
      website,
      address,
      city,
      state,
      postcode,
      country
    } = req.body

    // Prepare the data to be inserted into the database
    const data = {
      company_name,
      company_email,
      company_id: await getCompanyId(company_name),
      phone_number,
      industry_id,
      website,
      address,
      city,
      state,
      postcode,
      country
    }

    //Check role is super admin then allow company create
    if (req.headers.role === 'super_administrator') {
      // Use a transaction to ensure atomicity (all or nothing) while creating campaign and its associated data
      await sequelize.transaction(async (t) => {
        // Create the company record in the companies table
        const company = await Company.create(data, { transaction: t })

        //Create the user record in the users table
        await User.create({is_deletable: false, company_id: company.dataValues.id, email: company_email, role: 'administrator', status: 'active' }, { transaction: t })

        // Handle the successful response with the created company data
        handleResponse(res, { data: company, message: strings.CompanyCreated })
      })
    } else {
      //Handle error company create not eligiable
      handleError(strings.CompanyNotEligible, req, res)
    }
  } catch (error) {
    // Handle any other errors that occurred during the execution
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `findAll`
 * Get all company with filters, search, sorting and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = (req, res) => {
  try {
    if (req.headers.role === 'super_administrator') {
      const { page, per_page } = req.query;

      // Get the limit and offset values for pagination
      const { limit, offset } = getPagination(page, per_page)

      // Get the sorting parameters for the query
      const sortResponse = sortingData(req)

      const attributes = [
        'id',
        'company_id',
        'company_name',
        'updated_at',
        'country',
        'status',
        'company_email',
        'created_at',
        [
          sequelize.literal(`(
          SELECT COUNT(*)
          FROM "${prefixTableName('users')}" AS a
          WHERE a."company_id" = "companies"."id"
          AND a.status = 'active'
        )`),
          'user_count'
        ]
      ];

      if (req?.query?.include_media) {
        attributes.push([
          sequelize.literal(`(
          SELECT array_agg(
            json_build_object(
              'media_id', b."id",
              'entity_id', b."entity_id",
              'path', b."path",
              'company_id', a."id"
            )
          )
          FROM "${prefixTableName('companies')}" AS a
          INNER JOIN "${prefixTableName('media')}" AS b ON a.id = b.entity_id
          WHERE a.id = "companies".id
        )`),
          'image'
        ]);
      }

      // Find and count all companies with applied filters, sorting, limit, and offset
      Company.findAndCountAll(
        {
          where: handleSearchAndFilters(req, ['company_name', 'company_email', 'country']), // Apply search and filter conditions
          order: [[sortResponse.sortKey, sortResponse.sortValue]], // Apply sorting
          limit, offset,
          include: [{
            model: Industry,
          }],
          attributes
        }
      )
        .then(async (data) => {
          // Prepare the response data with pagination information
          handleResponse(res, { data: getPagingResults(data, page, limit) })
        }).catch(error => {
          // Handle any error that occurred during the retrieval process
          handleError(error, req, res)
        })
    } else {
      handleError(strings.YouDoNotAccess, req, res)
    }
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `findOne`
 * Get by company ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findOne = async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.headers.user_id }, raw: true })

    if (req.headers.role === 'super_administrator' || user.company_id === req.params.id) {
      // Find a campaign by its primary key (id)
      Company.findByPk(req.params.id, {
        // Include associated models: industry
        include: [
          {
            model: Industry
          }
        ]
      })
        .then(async (data) => {
          // Prepare the response with the campaign data or an empty object if data is not found
          handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} })
        }).catch(error => {
          // Handle any error that occurred during the retrieval process
          handleError(error, req, res)
        })
    } else {
      handleError(strings.YouDoNotAccess, req, res)
    }
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `update`
 * Update company by id
 * @param req - The request object.
 * @param res - The response object.
 */
exports.update = async (req, res) => {
  // Validate the request body using updateCompanySchema
  const { error } = updateCompanySchema.validate(req.body,)

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    const user = await User.findOne({ where: { id: req.headers.user_id }, raw: true })

    if (req.headers.role === 'super_administrator' || user.company_id === req.params.id) {
      Company.update(req.body, { where: { id: req.params.id } })
        .then(data => {
          // Check if the update was successful
          data[0] == 1 ? handleResponse(res, { message: strings.CompanyUpdated }) :
            handleError(strings.CompanyNotFound, req, res)
        }).catch(err => {
          // Handles any errors that occur during the query
          handleError(err, req, res)
        })
    } else {
      handleError(strings.YouDoNotAccess, req, res);
    }
  } catch (error) {
    // Handles any errors that occur in the try block
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `delete`
 * Delete company by ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.delete = async (req, res) => {
  try {
    if (req.headers.role === 'super_administrator') {
      Company.update({ status: 'deleted' }, { where: { id: req.params.id } })
        .then(data => {
          data[0] == 1 ? handleResponse(res, { message: strings.CompanyDeleted }) :
            handleError(strings.CompanyNotFound, req, res)
        }).catch(err => {
          // Handles any errors that occur during the query
          handleError(err, req, res)
        })
    } else {
      handleError(YouDoNotAccess, req, res)
    }
  } catch (error) {
    // Handles any errors that occur in the try block
    handleError(error, req, res)
  }
}

//How many users are there in different groups of Company Id, count by Company Id
exports.countAll = async (req, res) => {
  try {
    const { id } = req.params

    const employeeCount = await Company.findByPk(id, {
      attributes: [
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM "${prefixTableName('users')}" AS a
            WHERE a."company_id" = '${id}'
          )`),
          'user_count'
        ]
      ]
    })

    const department = await Group.findAndCountAll({ where: { status: { [Op.in]: ['active'] }, company_id: id, type: 'department' } })

    const group = await Group.findAndCountAll({ where: { status: { [Op.in]: ['active'] }, company_id: id, type: 'group' } })

    const tag = await Group.findAndCountAll({ where: { status: { [Op.in]: ['active'] }, company_id: id, type: 'tag' } })

    const counts = await sequelize.query(`
      SELECT
        (SELECT COUNT(DISTINCT a."id")
        FROM "${prefixTableName('users')}" AS a
        JOIN "${prefixTableName('groups_relationships')}" AS b ON a."id" = b."user_id"
        JOIN "${prefixTableName('groups')}" AS c ON b."group_id" = c."id"
        WHERE c."type" = 'tag'
          AND c."company_id" = '${id}') AS "tag_count",
        (SELECT COUNT(DISTINCT a."id")
        FROM "${prefixTableName('users')}" AS a
        JOIN "${prefixTableName('groups_relationships')}" AS b ON a."id" = b."user_id"
        JOIN "${prefixTableName('groups')}" AS c ON b."group_id" = c."id"
        WHERE c."type" = 'department'
          AND c."company_id" = '${id}') AS "department_count",
        (SELECT COUNT(DISTINCT a."id")
        FROM "${prefixTableName('users')}" AS a
        JOIN "${prefixTableName('groups_relationships')}" AS b ON a."id" = b."user_id"
        JOIN "${prefixTableName('groups')}" AS c ON b."group_id" = c."id"
        WHERE c."type" = 'group'
          AND c."company_id" = '${id}') AS "group_count"
    `, { plain: true });

    const tagCount = counts.tag_count;
    const departmentCount = counts.department_count;
    const groupCount = counts.group_count;

    handleResponse(res, {
      data: {
        employees: employeeCount?.dataValues?.user_count ? parseInt(employeeCount?.dataValues?.user_count) : 0,
        department: {
          count: department?.count ? department?.count : 0,
          employees: departmentCount
        },
        group: {
          count: group?.count ? group?.count : 0,
          employees: groupCount
        },
        tag: {
          count: tag?.count ? tag?.count : 0,
          employees: tagCount
        }
      }
    })

  } catch (error) {
    handleError(error, req, res)
  }
}

//Get company admins by company id
exports.admins = async (req, res) => {
  const { page, per_page } = req.query;
  const { limit, offset } = getPagination(page, per_page)
  const sortResponse = sortingData(req)

  if (req.headers.role !== 'super_administrator') {
    req.query.filters.company_id = req.headers.company_id
  }

  try {
    User.findAndCountAll({
      where: handleSearchAndFilters(req, ['first_name', 'last_name', 'email', 'status', 'role', 'country', 'state', 'city']),
      order: [[sortResponse.sortKey, sortResponse.sortValue]],
      limit, offset,
      attributes: { exclude: ['otp'] }
    }).then((data) => {
      handleResponse(res, { data: getPagingResults(data, page, limit) })
    }).catch(error => {
      handleError(error, req, res)
    })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Assign admin by company id
exports.addAdmin = async (req, res) => {
  try {
    for (let i = 0; i < req.body.length; i++) {
      const element = req.body[i];

      const user = await User.findOne({ where: { company_id: req.params.company_id, id: element } })

      if (user) {
        User.update({ role: 'administrator' }, { where: { id: user.dataValues.id } })
      }
    }
    handleResponse(res, { message: strings.UserUpdated })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Remove admin by company id
exports.removeAdmin = async (req, res) => {
  try {
    User.update({ role: 'user' }, { where: { company_id: req.params.company_id, id: req.query.user_id } }).then((data) => {
      handleResponse(res, data)
    }).catch((error) => {
      handleError(error, req, res)
    })
  } catch (error) {
    handleError(error, req, res)
  }
}