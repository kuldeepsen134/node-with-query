//Import models database
const { Family } = require('app/models');

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
const { handleSearchAndFilters } = require('app/v1/admin/controllers/helper');

//Import validation schemas
const { createFamilyValidatorSchema } = require('./validator');
const { Op } = require('sequelize');

/**
 * Export an asynchronous function named `create`
 * Create family
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {

  // Validate the request body using createFamilyValidatorSchema
  const { error } = createFamilyValidatorSchema.validate(req.body);

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res);
    return;
  }

  try {
    const {
      email,
      type,
      relation,
      full_name
    } = req.body;

    // Prepare the data object for creating a new Domain instance
    const data = {
      email,
      type,
      relation,
      full_name,
      user_id: req.headers.user_id
    };

    // Create a new Domain instance using the data object
    Family.create(data)
      .then(async (data) => {
        // Handle the successful response by sending the created data and a success message
        handleResponse(res, { data: data, message: strings.EmailAdd });
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

    const searchAndFilters = handleSearchAndFilters(req, ['email', 'full_name', 'relation']);
    const where = {
      [Op.and]: [searchAndFilters],
      [Op.or]: [{ user_id: req.headers.user_id }],
    };

    // Find and count all Domain instances based on search filters, sort order, limit, and offset
    Family.findAndCountAll({
      where,
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
 * Export an asynchronous function named `delete`
 * Delte by domain ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.delete = async (req, res) => {
  try {
    // Delete the Domain instance with the provided id
    Family.destroy({ where: { id: req.params.id } })
      .then(data => {
        // Check if the delete operation affected 1 row
        if (data === 1) {
          // Handle the successful response with a success message
          handleResponse(res, { message: strings.DeleteMember });
        } else {
          // If the Domain was not found, handle the error with a specific message
          handleError(strings.MemberNotFound, req, res);
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
