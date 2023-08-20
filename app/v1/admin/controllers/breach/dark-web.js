//Import Op oprator sequlize
const { Op } = require('sequelize')

//Import models database
const { DarkWeb } = require('app/models')

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  sortingData,
  getPagingResults
} = require('app/utils')

const { createBreachValidatorSchema } = require('./validator')
const { handleSearchAndFilters } = require('../../controllers/helper')

exports.create = async (req, res) => {

  const { error } = createBreachValidatorSchema.validate(req.body)

  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    const {
      dark_market_id,
      database_name,
      domain,
      discovered_date,
      status
    } = req.body

    const data = {
      dark_market_id,
      database_name,
      domain,
      discovered_date,
      status
    }

    // Create a new Group record using the provided data
    DarkWeb.create(data)
      .then(async (data) => {
        // If the group creation is successful, send a success response with the created group data and a success message
        handleResponse(res, { data: data, message: strings.DarkWebCreated })
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

exports.findAll = async (req, res) => {
  try {
    const { page, per_page } = req.query;

    // Calculate the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page);
    // Get the sort key and sort value based on the request
    const sortResponse = sortingData(req);

    // Find and count all groups with optional search and filter criteria
    DarkWeb.findAndCountAll({
      where: handleSearchAndFilters(req, ['database_name']),
      order: [[sortResponse.sortKey, sortResponse.sortValue]], // Sets the sort order based on the sort key and sort value
      limit, offset,// Sets the limit and offset for pagination
    }).then((data) => {
      handleResponse(res, { data: getPagingResults(data, page, limit) })
    })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.delete = async (req, res) => {
  try {
    DarkWeb.destroy({ where: { id: req.params.id } })
      .then(data => {
        data == 1 ? handleResponse(res, { message: strings.DarkWebDeleted }) :
          handleError(strings.DarkWebNotFound, req, res)
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}