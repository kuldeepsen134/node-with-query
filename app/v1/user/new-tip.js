const { NewsAndTip } = require('app/models');

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  getPagination,
  getPagingResults,
  sortingData
} = require('app/utils');

//Import handleSearchAndFilters function
const { handleSearchAndFilters } = require('app/v1/admin/controllers/helper');

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