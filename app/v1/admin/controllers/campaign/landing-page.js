//Import models database
const { LandingPage, TagRelationship, sequelize, User, Company } = require('app/models')

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData,
  prefixTableName
} = require('app/utils')

//Import handleSearchAndFilters function
const { handleSearchAndFilters, queryFilter } = require('../helper')

//Import validation schemas
const { createLandingPageSchema, updateLandingPageSchema } = require('./validator')
const { Op } = require('sequelize')

/**
 * Export an asynchronous function named `create`
 * Create landing page
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {

  // Validate the request body using the createCampaignSchema
  const { error } = createLandingPageSchema.validate(req.body,)

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res)
    return
  }
  try {
    // Destructure the required fields from the request body
    const {
      title,
      language,
      html_content,
      file,
      complexity,
      redirect_url,
      capture_submitted_data,
      capture_password
    } = req.body

    const { user_id } = req.headers
    const company_id = req.headers.role === 'super_administrator' ? req.body.company_id || null : req.headers.company_id

    // Prepare the data to be inserted into the database
    const data = {
      title,
      language,
      complexity,
      html_content,
      file,
      created_by: user_id,
      redirect_url,
      capture_submitted_data,
      capture_password,
      company_id: company_id
    }

    // Use a transaction to ensure atomicity (all or nothing) while creating campaign and its associated data
    await sequelize.transaction(async (t) => {
      // Create the landing page record in the Landing page table
      const landingPage = await LandingPage.create(data, { transaction: t })

      // Prepare the tag data to be inserted into the Tag table
      const tags = req?.body?.tag_ids?.map((item) => {
        return ({
          tag_id: item,
          entity_id: landingPage.dataValues.id
        })
      })
      if (tags) {
        // Bulk create the tag records in the Tag relationship table
        await TagRelationship.bulkCreate(tags)
      }
      // Handle the successful response with the created landing page data
      handleResponse(res, { data: landingPage, message: strings.LandingPageCreated })
    }).catch(error => {
      // Handle any errors that occurred during the transaction
      handleError(error, req, res)
    })
  } catch (error) {
    // Handle any other errors that occurred during the execution
    handleError(error, req, res)
  }

}

/**
 * Export an asynchronous function named `findAll`
 * Get all Landing page with filters, search, sorting and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = async (req, res) => {
  try {
    // Extract the page and per_page query parameters from the request
    const { page, per_page } = req.query;

    // Get the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page);

    // Get the sorting parameters for the query
    const sortResponse = sortingData(req);

    // Find and count all landing pages with applied filters, sorting, limit, and offset
    const data = await LandingPage.findAndCountAll({
      where: {
        [Op.and]: [
          handleSearchAndFilters(req, ['title']), // Apply search and filter conditions
          req?.query?.filters?.tag_ids && queryFilter(req) && sequelize.literal(`
            EXISTS (
              SELECT 1
              FROM "${prefixTableName('tags_relationships')}" AS a
              WHERE a.entity_id = "landing_pages".id
              AND a.tag_id IN (${queryFilter(req)})
            )
          `),
        ],
      },
      order: [[sortResponse.sortKey, sortResponse.sortValue]], // Apply sorting
      limit,
      offset,
      attributes: {
        include: [
          [
            sequelize.literal(`
              (
                SELECT array_agg(
                  json_build_object(
                    'tag_id', b."tag_id",
                    'entity_id', b."entity_id",
                    'title', c."title"
                  )
                )
                FROM 
                  "${prefixTableName('landing_pages')}" AS a
                  INNER JOIN "${prefixTableName('tags_relationships')}" AS b ON a.id = b."entity_id"
                  INNER JOIN "${prefixTableName('tags')}" AS c ON c.id = b."tag_id"
                WHERE a.id = "landing_pages".id
              )
            `),
            'tag_ids',
          ], // Get landing page tags by entity ID and tag ID
        ],
      },
    });

    // Prepare the response data with pagination information
    handleResponse(res, { data: getPagingResults(data, page, limit) });
  } catch (error) {
    // Handle any error that occurred during the retrieval process
    handleError(error, req, res);
  }
};


/**
 * Export an asynchronous function named `findOne`
 * Get by landing page ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findOne = async (req, res) => {
  try {
    let where;
    if (!(req.headers.role === 'super_administrator')) {
      where = {
        [Op.or]: [
          { company_id: req.headers.company_id },
          { company_id: null }
        ]
      };
    }

    // Find a campaign by its primary key (id)
    LandingPage.findOne({
      where: {id: req.params.id, ...where},
      include: [
        {
          model: User
        },
        {
          model: Company
        }
      ],
      attributes: {
        include: [
          [sequelize.literal(`(
            SELECT array_agg( 
              json_build_object(
              'tag_id', b."tag_id",
              'title', c."title"
            ))
          FROM "${prefixTableName('landing_pages')}" AS a 
          JOIN "${prefixTableName('tags_relationships')}" AS b ON a.id = b.entity_id 
          LEFT JOIN "${prefixTableName('tags')}" AS c ON c.id = b.tag_id
          WHERE b.entity_id = '${req.params.id}'
          )`), 'tag_ids']
        ]
      }
    })
      .then(async (data) => {
        // Prepare the response with the landing page data or an empty object if data is not found
        handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} })
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
 * Export an asynchronous function named `update`
 * Update landing page by id
 * @param req - The request object.
 * @param res - The response object.
 */
exports.update = async (req, res) => {

  // Validate the request body using updateLandingPageSchema
  const { error } = updateLandingPageSchema.validate(req.body,)

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    let where;
    if (!(req.headers.role === 'super_administrator')) {
      where = {
        [Op.or]: [
          { company_id: req.headers.company_id },
          { company_id: null }
        ]
      };
    }
    // Use a transaction to ensure atomicity (all or nothing) while creating campaign and its associated data
    await sequelize.transaction(async (t) => {
      //Update landing page by ID
      const result = await LandingPage.update(req.body, { where: { id: req.params.id, ...where } })

      //Delete tag relationships by landing page id as entity id in tag relationshp table
      await TagRelationship.destroy({ where: { entity_id: req.params.id } }, { transaction: t })

      // Prepare the tag data to be inserted into the Tagrelationship table
      const tags = req?.body?.tag_ids?.map((item) => {
        return ({
          tag_id: item.tag_id ? item.tag_id : item,
          entity_id: req.params.id
        })
      })

      if (tags?.length > 0) {
        // Bulk create the tag records in the Tagrelationship table
        await TagRelationship.bulkCreate(tags, { transaction: t })
      }
      // Check if the update was successful
      result[0] == 1 ? handleResponse(res, { message: strings.LandingPageUpdated }) :
        handleError(strings.LandingPageNotFound, req, res)
    }).catch(error => {
      // Handle any errors that occur during the update process
      handleError(error, req, res)
    })
  } catch (error) {
    // Handles any errors that occur in the try block
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `delete`
 * Delete landing page by ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.delete = async (req, res) => {
  try {
    LandingPage.update({ status: 'deleted' }, { where: { id: req.params.id } })
      .then(data => {
        // If the campaign is successfully deleted, respond with a success message.
        // If not, handle the 'Campaign Not Found' error.
        data[0] == 1 ? handleResponse(res, { message: strings.LandingPageDeleted }) :
          handleError(strings.LandingPageNotFound, req, res)
      }).catch(err => {
        // Handles any errors that occur during the query
        handleError(err, req, res)
      })
  } catch (error) {
    // Handles any errors that occur in the try block
    handleError(error, req, res)
  }
}
