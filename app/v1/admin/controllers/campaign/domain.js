//Import models database
const { Domain, Company } = require('app/models');

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData
} = require('app/utils');

//Import handleSearchAndFilters function
const { handleSearchAndFilters } = require('../helper');

//Import validation schemas
const { createDomainSchema, updateDomainSchema } = require('./validator');

/**
 * Export an asynchronous function named `create`
 * Create domain
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {

  // Validate the request body using createDomainSchema
  const { error } = createDomainSchema.validate(req.body);

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res);
    return;
  }

  try {
    const {
      title,
      ip,
      status,
      expiry_date
    } = req.body;

    // Prepare the data object for creating a new Domain instance
    const data = {
      title,
      ip,
      status,
      expiry_date,
      company_id: req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id
    };

    // Create a new Domain instance using the data object
    Domain.create(data)
      .then(async (data) => {
        // Handle the successful response by sending the created data and a success message
        handleResponse(res, { data: data, message: strings.DomainCreated });
      }).catch(error => {
        // Handle any error that occurred during the creation process
        handleError(error, req, res);
      });
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res);
  }

}

/**
 * Export an asynchronous function named `findAll`
 * Get all domains with filters, search, sorting and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = (req, res) => {
  try {
    const { page, per_page } = req.query; // Extracts 'page' and 'per_page' from the query parameters

    // Calculates the 'limit' and 'offset' values for pagination
    const { limit, offset } = getPagination(page, per_page);

    // Retrieves the sort key and sort value for sorting the data
    const sortResponse = sortingData(req);


    // Find and count all Domain instances based on search filters, sort order, limit, and offset
    Domain.findAndCountAll({
      where: handleSearchAndFilters(req, ['title']),
      include: {
        model: Company
      },
      order: [[sortResponse.sortKey, sortResponse.sortValue]], // Sets the sort order based on the sort key and sort value
      limit, offset // Sets the limit and offset for pagination
    })
      .then(async (data) => {
        // Sends the paginated data as a response
        handleResponse(res, { data: getPagingResults(data, page, limit) });
      }).catch(error => {
        // Handle any error that occurred during the retrieval process
        handleError(error, req, res);
      });
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res);
  }
}

/**
 * Export an asynchronous function named `findOne`
 * Get by domain ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findOne = async (req, res) => {
  try {
    // Find a Domain instance by primary key (id)
    Domain.findOne({
      where: { id: req.params.id },
      include: {
        model: Company
      }
    })
      .then(async (data) => {
        // Handle the response by sending the found data or an empty object if not found
        handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} });
      }).catch(error => {
        // Handle any error that occurred during the retrieval process
        handleError(error, req, res);
      });
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res);
  }
}

/**
 * Export an asynchronous function named `update`
 * Update by domain ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.update = async (req, res) => {

  // Validate the request body using updateDomainSchema
  const { error } = updateDomainSchema.validate(req.body);

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res);
    return;
  }

  try {
    // Update the Domain instance with the provided data
    Domain.update(req.body, { where: { id: req.params.id } })
      .then(data => {
        // Check if the update operation affected 1 row
        if (data[0] === 1) {
          // Handle the successful response with a success message
          handleResponse(res, { message: strings.DomainUpdated });
        } else {
          // If the Domain was not found, handle the error with a specific message
          handleError(strings.DomainNotFound, req, res);
        }
      }).catch(err => {
        // Handle any error that occurred during the update process
        handleError(err, req, res);
      });
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res);
  }
}

/**
 * Export an asynchronous function named `delete`
 * Delte by domain ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.delete = async (req, res) => {
  try {
    // Delete the Domain instance with the provided id
    Domain.destroy({ where: { id: req.params.id } })
      .then(data => {
        // Check if the delete operation affected 1 row
        if (data === 1) {
          // Handle the successful response with a success message
          handleResponse(res, { message: strings.DomainDeleted });
        } else {
          // If the Domain was not found, handle the error with a specific message
          handleError(strings.DomainNotFound, req, res);
        }
      }).catch(err => {
        // Handle any error that occurred during the delete process
        handleError(err, req, res);
      });
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res);
  }
}
