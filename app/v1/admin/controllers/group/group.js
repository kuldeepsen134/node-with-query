//Import Op oprator sequlize
const { Op } = require('sequelize')

//Import models database
const { Group, sequelize, User, GroupRelationship } = require('app/models')

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData,
  getSlug,
  prefixTableName
} = require('app/utils')

//Import handleSearchAndFilters function
const { handleSearchAndFilters } = require('../helper')

//Import validation schemas
const { createGroupValidatorSchema, updateGroupValidatorSchema } = require('./validator')

/**
 * Export an asynchronous function named `create`
 * Create Group
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {

  // Validate the request body using the createGroupValidatorSchema
  const { error } = createGroupValidatorSchema.validate(req.body)

  if (error) {
    // If there is a validation error, handle the error and send an appropriate response
    handleError(error, req, res)
    return
  }

  // Generate a slug based on the provided title, or use the default slug if not provided
  const slug = await getSlug(req.body.slug ? req.body.slug : req.body.title)

  try {
    const {
      title,
      description,
      type
    } = req.body

    // Determine the company ID based on the user's role
    const company_id = req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id

    // Create an object with the data for the new group
    const data = {
      title,
      type,
      slug,
      description,
      company_id,
    }

    // Create a new Group record using the provided data
    Group.create(data)
      .then(async (data) => {
        // If the group creation is successful, send a success response with the created group data and a success message
        handleResponse(res, { data: data, message: strings.GroupCreated })
      })
      .catch(error => {
        // If there is an error during the group creation, handle the error and send an appropriate response
        handleError(error, req, res)
      })
  } catch (error) {
    // If any error occurs in the try block, handle the error and send an appropriate response
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `findAll`
 * Get all groups with filters, search, sort, user count and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = async (req, res) => {
  try {
    // Retrieve the page and per_page parameters from the request query
    const { page, per_page } = req.query;

    // Calculate the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page);
    // Get the sort key and sort value based on the request
    const sortResponse = sortingData(req);

    // Find and count all groups with optional search and filter criteria
    Group.findAndCountAll({
      where: handleSearchAndFilters(req, ['title', 'type', 'slug']),
      order: [[sortResponse.sortKey, sortResponse.sortValue]], // Sets the sort order based on the sort key and sort value
      limit, offset,// Sets the limit and offset for pagination
      attributes: [
        'id',
        'title',
        'type',
        'description',
        'updated_at',
        'created_at',
        [
          // Subquery to count the number of users in each group from the specified company
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM "${prefixTableName('users')}" AS a
            JOIN "${prefixTableName('groups_relationships')}" AS b
              ON a."id" = b."user_id"
            WHERE b."group_id" = "groups"."id"
              AND a."company_id" = '${req?.headers?.role === 'super_administrator' ? req?.query?.filters?.company_id || null : req?.headers?.company_id}'
          )`),
          'user_count'
        ]
      ]
    })
      .then(async (data) => {
        // Prepare the response with the paginated group data
        handleResponse(res, { data: getPagingResults(data, page, limit) })
      }).catch(error => {
        // Handle any error that occurred during the retrieval process
        handleError(error, req, res)
      })
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}


/**
 * Export an asynchronous function named `findOne`
 * Get by group ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findOne = async (req, res) => {
  try {
    // Find a group by its primary key (id)
    Group.findByPk(req.params.id, {})
      .then(async (data) => {
        // If a group is found, prepare the response with the group data
        // If a group is not found, prepare the response with an empty object
        handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} })
      }).catch(error => {
        // If there is an error during the process, handle the error and send an appropriate response
        handleError(error, req, res)
      })
  } catch (error) {
    // If any error occurs, handle the error and send an appropriate response
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `update`
 * Update by group ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.update = async (req, res) => {

  // Generate a slug based on the provided slug or name, or use the default slug if not provided
  req.body.slug = await getSlug(req.body.slug ? req.body.slug : req.body.name)

  try {
    // Update the group using the provided data, where the group ID matches the request parameter
    Group.update(req.body, { where: { id: req.params.id } })
      .then(data => {
        // Check the number of affected rows to determine if the group was found and updated
        if (data[0] === 1) {
          // If the group was successfully updated, send a success response with a success message
          handleResponse(res, { message: strings.GroupUpdated })
        } else {
          // If the group was not found, handle the error and send an appropriate response
          handleError(strings.GroupNotFound, req, res)
        }
      }).catch(err => {
        // If there is an error during the update process, handle the error and send an appropriate response
        handleError(err, req, res)
      })
  } catch (error) {
    // If any error occurs, handle the error and send an appropriate response
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `delete`
 * Delte by group ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.delete = async (req, res) => {
  try {
    // Update the group's status to 'deleted' using the provided group ID
    Group.update({ status: 'deleted' }, { where: { id: req.params.id } })
      .then(data => {
        // Check the number of affected rows to determine if the group was found and updated
        if (data[0] === 1) {
          //Delete all relationships in group relationship table by group ID
          GroupRelationship.destroy({ where: { group_id: req.params.id } })
          // If the group was successfully updated, send a success response with a success message
          handleResponse(res, { message: strings.GroupDeleted })
        } else {
          // If the group was not found, handle the error and send an appropriate response
          handleError(strings.GroupNotFound, req, res)
        }
      }).catch(err => {
        // If there is an error during the update process, handle the error and send an appropriate response
        handleError(err, req, res)
      })
  } catch (error) {
    // If any error occurs, handle the error and send an appropriate response
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `userAddGroup`
 * Users add in group by group ID and user_ids
 * @param req - The request object.
 * @param res - The response object.
 */
exports.userAddGroup = async (req, res) => {
  // Determine the company ID based on the user's role

  if (req.body.length > 0) {
    let groups = []

    // Iterate through the user IDs provided in the request body
    for (let i = 0; i < req.body.length; i++) {
      const element = req.body[i];

      // Find the user by ID and company ID
      const user = await User.findOne({ where: { id: element, status: { [Op.ne]: 'deleted' } } });

      const groupRelation = await GroupRelationship.findOne({ where: { group_id: req.params.id, user_id: element } })

      // Check if a GroupRelationship already exists for the user and group
      if (user?.dataValues?.id && !groupRelation?.dataValues?.id) {
        // If the user exists and there is no GroupRelationship, add the user ID to the groups array
        groups.push(user.dataValues.id)
      }
    }
    // Create an array of GroupRelationship objects based on the groups array and request parameters
    const data = groups?.map((item) => {
      return ({
        group_id: req.params.id,
        user_id: item
      })
    })

    // Bulk create the GroupRelationships using the created data
    await GroupRelationship.bulkCreate(data)

    // Send a success response with a success message
    handleResponse(res, { message: strings.AddUserGroup })
  } else {
    // If no user IDs are provided, handle the error and send an appropriate response
    handleError(strings.SelectUser, req, res)
  }
}

/**
 * Export an asynchronous function named `groupUsers`
 * Get all users group by ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.groupUsers = async (req, res) => {
  try {
    // Retrieve the page and per_page parameters from the request query
    const { page, per_page } = req.query;

    // Calculate the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page);

    // Get the sort key and sort value based on the request
    const sortResponse = sortingData(req);

    // Find and count all users belonging to the specified group, with optional search and filter criteria
    User.findAndCountAll(
      {
        where: {
          [Op.and]: [
            // Combine search and filter conditions using the handleSearchAndFilters function
            handleSearchAndFilters(req, ['first_name', 'last_name', 'email', 'status', 'role', 'country', 'state', 'city']),
            // Check if the user exists in the specified group
            sequelize.literal(`
            EXISTS (
              SELECT 1
              FROM "${prefixTableName('groups_relationships')}" AS a
              WHERE a.user_id = "users".id
              AND a.group_id IN ('${req.params.id}')
            )
            `)
          ]
        },
        order: [[sortResponse.sortKey, sortResponse.sortValue]],
        limit,
        offset,
      }
    )
      .then(async (data) => {
        // Prepare the response with the paginated user data
        handleResponse(res, { data: getPagingResults(data, page, limit) })
      }).catch(error => {
        // If there is an error during the process, handle the error and send an appropriate response
        handleError(error, req, res)
      })
  } catch (error) {
    // If any error occurs, handle the error and send an appropriate response
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `delete`
 * Remove user in a group by group ID and user ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.userRemoveGroup = async (req, res) => {
  try {
    if (req?.query?.user_id?.length > 0) {
      // Check if user_id is provided in the request query
      GroupRelationship.destroy({
        where: { group_id: req.params.id, user_id: req.query.user_id }
      }).then(data => {
        // Check if the delete operation affected 1 row
        if (data === 1) {
          // If the user group relationship was successfully deleted, handle the successful response with a success message
          handleResponse(res, { message: strings.UserRemoveGroup });
        } else {
          // If the user group relationship was not found, handle the error with a specific message
          handleError(strings.UserNotFound, req, res);
        }
      }).catch(err => {
        // If there is an error during the delete operation, handle the error and send an appropriate response
        handleError(err, req, res);
      })
    } else {
      // If user_id is not provided in the request query, handle the error with a specific message
      handleError(strings.UserIdRequired, req, res)
    }
  } catch (error) {
    // If any error occurs, handle the error and send an appropriate response
    handleError(error, req, res);
  }
}