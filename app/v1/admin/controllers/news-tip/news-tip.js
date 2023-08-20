//Import models database
const { NewsAndTip, Company } = require('app/models');

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
const { createNewsAndTipValidatorSchema } = require('./validator');

/**
 * Export an asynchronous function named `create`
 * Create domain
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {

  // Validate the request body using createDomainSchema
  const { error } = createNewsAndTipValidatorSchema.validate(req.body);

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res);
    return;
  }

  try {
    const {
      title,
      short_description,
      type,
      html_content,
      link
    } = req.body;

    // Prepare the data object for creating a new Domain instance
    const data = {
      title,
      short_description,
      type,
      html_content,
      link
    };

    // Create a new Domain instance using the data object
    NewsAndTip.create(data)
      .then(async (data) => {
        // Handle the successful response by sending the created data and a success message
        handleResponse(res, { data: data, message: req.body.type === 'news' ? strings.NewsCreated : strings.TipCreated });
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
    NewsAndTip.findAndCountAll({
      where: handleSearchAndFilters(req, ['title']),
      include: [
        {
          model: Company
        }
      ],
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

exports.findOne = async (req, res) => {
  try {
    NewsAndTip.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Company
        }
      ],
    })
      .then(async (data) => {
        handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} })
      }).catch(error => {
        handleError(error, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.update = async (req, res) => {

  try {
    NewsAndTip.update(req.body, { where: { id: req.params.id } })
      .then(data => {
        if (data[0] === 1) {
          handleResponse(res, { message: strings.NewsAndTipUpdate })
        } else {
          handleError(strings.ItmeNotFound, req, res)
        }
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.delete = async (req, res) => {
  try {
    NewsAndTip.destroy({ where: { id: req.params.id } })
      .then(data => {
        if (data === 1) {
          handleResponse(res, { message: strings.DeleteItem });
        } else {
          handleError(strings.ItmeNotFound, req, res);
        }
      }).catch(err => {
        handleError(err, req, res);
      });
  } catch (error) {
    handleError(error, req, res);
  }
}
