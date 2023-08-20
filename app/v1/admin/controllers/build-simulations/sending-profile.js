//Import models database
const { SendingProfile, User, Company } = require('app/models')

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData
} = require('app/utils')

//Import handleSearchAndFilters function
const { handleSearchAndFilters } = require('../helper')

//Import validation schemas
const { updateSendingProfileSchema, createSendingProfileSchema, sendTestEmailSchema } = require('./validator')
const { bulkEmail } = require('../../../../send-email')
const { Op } = require('sequelize')

/**
 * Export an asynchronous function named `create`
 * Create sending profile
 * @param req - The request object.
 * @param res - The response object.
 */exports.create = async (req, res) => {

  try {
    // Validate the request body using the createSendingProfileSchema
    const company_id = req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id

    const { error } = createSendingProfileSchema.validate(req.body,)

    // If there is a validation error, handle it and return
    if (error) {
      handleError(error, req, res)
      return
    }

    // Destructure the required fields from the request body
    const {
      encryption,
      host,
      port,
      user_name,
      password,
      description,
      label
    } = req.body

    // Prepare the data to be inserted into the database
    const data = {
      host,
      description,
      user_name,
      port,
      encryption,
      password,
      company_id,
      label
    }

    // Create the sending profile record in the Campaign table
    SendingProfile.create(data)
      .then(async (data) => {

        // Handle the successful response with the created sending profile data
        handleResponse(res, { data: data, message: strings.SendingProfileCreated })
      }).catch(error => {
        // Handle any errors that occurred during the creatation
        handleError(error, req, res)
      })
  } catch (error) {
    // Handle any errors that occurred during the execution
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `findAll`
 * Get all sending profile with filters, search, sorting and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = (req, res) => {
  try {
    // Extract the page and per_page query parameters from the request
    const { page, per_page } = req.query;

    // Get the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page)

    // Get the sorting parameters for the query
    const sortResponse = sortingData(req)

    // Find and count all sending profiles with applied filters, sorting, limit, and offset
    SendingProfile.findAndCountAll(
      {
        where: handleSearchAndFilters(req, ['host', 'encryption', 'user_name']), // Apply search and filter conditions
        order: [[sortResponse.sortKey, sortResponse.sortValue]], // Apply sorting
        limit, offset,
        include: [
          {
            model: Company,
            attributes: ['company_name', 'id']
          }
        ]
      }
    )
      .then(async (data) => {
        // Prepare the response data with pagination information
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
 * Get by sending profile ID
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

    // Find a sending profile by its primary key (id)
    SendingProfile.findOne({
      where: { id: req.params.id, ...where },
      include: [
        {
          model: Company,
        },
      ],
    })
      .then(async (data) => {
        // Prepare the response with the sending profile data or an empty object if data is not found
        handleResponse(res, { data: data?.dataValues ? data?.dataValues : {} });
      })
      .catch((error) => {
        // Handle any error that occurred during the retrieval process
        handleError(error, req, res);
      });
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res);
  }
};

/**
 * Export an asynchronous function named `update`
 * Update sending profile by id
 * @param req - The request object.
 * @param res - The response object.
 */
exports.update = async (req, res) => {
  try {
    // Validate the request body using updateSendingProfileSchema
    const { error } = updateSendingProfileSchema.validate(req.body);

    // If there is a validation error, handle it and return
    if (error) {
      handleError(error, req, res);
      return;
    }

    let where;
    if (!(req.headers.role === 'super_administrator')) {
      where = {
        [Op.or]: [
          { company_id: req.headers.company_id },
          { company_id: null }
        ]
      };
    }

    // Update sending profile by Id
    SendingProfile.update(req.body, { where: { id: req.params.id, ...where } })
      .then((data) => {
        data[0] === 1
          ? handleResponse(res, { message: strings.SendingProfileUpdated })
          : handleError(strings.SendingProfileNotFound, req, res);
      })
      .catch((err) => {
        handleError(err, req, res);
      });
  } catch (error) {
    handleError(error, req, res);
  }
};

//Delete SMTP profile by id
exports.delete = async (req, res) => {
  try {
    SendingProfile.destroy({ where: { id: req.params.id } })
      .then(data => {
        data == 1 ? handleResponse(res, { message: strings.SendingProfileDeleted }) :
          handleError(strings.SendingProfileNotFound, req, res)
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.sendTestEmail = async (req, res) => {

  const { error } = sendTestEmailSchema.validate(req.body)

  if (error) {
    handleError(error, req, res)
    return
  }
  try {
    let smtpProfile

    if (req?.body?.sending_profile_id) {
      smtpProfile = await SendingProfile.findOne({ where: { id: req.body.sending_profile_id }, raw: true })
    }

    let data = {
      from: `${req?.body?.from_name || ''} <${req.body.from}>`,
      email: `${req?.body?.to_name || ''} <${req.body.to}>`,
      reply: req.body.from,
      host: req?.body?.smtp?.host || smtpProfile?.host,
      port: req?.body?.smtp?.port || smtpProfile?.port,
      user: req?.body?.smtp?.user_name || smtpProfile?.user_name,
      pass: req?.body?.smtp?.password || smtpProfile.password,
      subject: req?.body?.subject || 'This is testing mail',
      email_content: req.body.message
    }

    const result = await bulkEmail(data);

    if (result?.accepted?.length > 0) {
      handleResponse(res, { message: strings.TestEmailSend })
    } else {
      handleError(result?.response || strings.TestEmailSendFaild, req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }

}