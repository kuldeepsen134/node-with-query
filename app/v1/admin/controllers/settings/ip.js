const { IPList } = require('app/models')

const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData
} = require('app/utils')


const { handleSearchAndFilters } = require('../helper')
const { createIPSchema } = require('../campaign/validator')

/**
 * Export an asynchronous function named `create`
 * Create IPList address
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {
  const { error } = createIPSchema.validate(req.body); // Validate the request body using createIPSchema

  if (error) {
    handleError(error, req, res); // Handle validation error
    return;
  }

  try {
    const {
      cidr,
      ip_range,
      note,
      verified,
      status,
      useragent
    } = req.body; // Destructure the required fields from the request body

    const data = {
      cidr,
      ip_range,
      verified,
      useragent,
      note,
      status
    }; // Create an object with the extracted fields
    if (req.headers.role === 'super_administrator') {

      if (req?.body?.update_existing === true) {
        const [IP, created] = await IPList.findOrCreate({
          where: { cidr: req.body.cidr },
          defaults: data
        });
        if (created) {
          handleResponse(res, { data: IP, message: strings.IPCreated })
        }
        if (created === false) {
          IPList.update(data, {
            where: { id: IP.id }
          }).then((data) => {
            if (data[0] === 1) {
              // Handle the successful response with a success message
              handleResponse(res, { message: strings.IPUpdated });
            } else {
              // If the user agent was not found, handle the error with a specific message
              handleError(strings.IPNotFound, req, res);
            }
          }).catch(error => {
            handleError(error, req, res);// Handles any errors that occur during the query
          });
        }
      } else {
        IPList.create(data).then((data) => {
          handleResponse(res, { data: data, message: strings.IPCreated })
        }).catch((error) => {
          handleError(error, req, res)// Handles any errors that occur during the query
        })
      }
    } else {
      handleError(strings.YouDoNotAccess, req, res)
    }
  } catch (error) {
    handleError(error, req, res); // Handle other errors
  }
};

/**
 * Export an asynchronous function named `findAll`
 * Get all IPList with filters, search, sorting and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = (req, res) => {
  try {
    const { page, per_page } = req.query; // Extracts 'page' and 'per_page' from the query parameters
    const { limit, offset } = getPagination(page, per_page); // Calculates the 'limit' and 'offset' values for pagination
    const sortResponse = sortingData(req); // Retrieves the sort key and sort value for sorting the data
    if (req.headers.role === 'super_administrator') {
      IPList.findAndCountAll(
        {
          where: handleSearchAndFilters(req, ['cidr', 'ip_range', 'useragent']), // Applies search and filter conditions to the query using specified fields
          order: [[sortResponse.sortKey, sortResponse.sortValue]], // Sets the sort order based on the sort key and sort value
          limit, offset // Sets the limit and offset for pagination
        }
      )
        .then(async (data) => {
          handleResponse(res, { data: getPagingResults(data, page, limit) }); // Sends the paginated data as a response
        }).catch(error => {
          handleError(error, req, res); // Handles any errors that occur during the query
        });
    } else {
      handleError(strings.YouDoNotAccess, req, res)
    }
  } catch (error) {
    handleError(error.req, res); // Handles any errors that occur in the try block
  }
};

/**
 * Export an asynchronous function named `findOne`
 * Get by IPList ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findOne = async (req, res) => {
  try {
    // Find a IPList instance by primary key (id)
    if (req.headers.role === 'super_administrator') {
      IPList.findByPk(req.params.id)
        .then(async (data) => {
          // Handle the response by sending the found data or an empty object if not found
          handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} });
        }).catch(error => {
          // Handle any error that occurred during the retrieval process
          handleError(error, req, res);
        });
    } else {
      handleError(strings.YouDoNotAccess, req, res)
    }
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res);
  }
}

/**
 * Export an asynchronous function named `update`
 * Update by IPIPList ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.update = async (req, res) => {

  try {
    // Update the IPList instance with the provided data
    IPList.update(req.body, { where: { id: req.params.id } })
      .then(data => {
        // Check if the update operation affected 1 row
        if (data[0] === 1) {
          // Handle the successful response with a success message
          handleResponse(res, { message: strings.IPUpdated });
        } else {
          // If the IPList was not found, handle the error with a specific message
          handleError(strings.IPNotFound, req, res);
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
 * Delte by IPList ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.delete = async (req, res) => {
  try {
    // Delete the IPList instance with the provided id
    IPList.destroy({ where: { id: req.params.id } })
      .then(data => {
        // Check if the delete operation affected 1 row
        if (data === 1) {
          // Handle the successful response with a success message
          handleResponse(res, { message: strings.IPDeleted });
        } else {
          // If the IPList was not found, handle the error with a specific message
          handleError(strings.IPNotFound, req, res);
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