const { Industry } = require('app/models')

const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData
} = require('app/utils')

const { handleSearchAndFilters } = require('../helper')
const { createIndustrySchema, updateIndustrySchema } = require('./validator')

//Create industry
exports.create = async (req, res) => {

  const { error } = createIndustrySchema.validate(req.body)

  if (error) {
    handleError(error, req, res)
    return
  }
  try {

    const {
      title,
      type,
      description
    } = req.body

    const data = {
      title,
      type,
      description
    }

    Industry.create(data)
      .then(async (data) => {
        handleResponse(res, { data: data, message: strings.IndustryCreated })
      }).catch(error => {

        handleError(error, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Get all industries
exports.findAll = (req, res) => {
  try {
    const { page, per_page } = req.query;
    const { limit, offset } = getPagination(page, per_page)
    const sortResponse = sortingData(req)

    Industry.findAndCountAll(
      {
        where: handleSearchAndFilters(req, ['title']),
        order: [[sortResponse.sortKey, sortResponse.sortValue]],
        limit, offset,
      }
    )
      .then(async (data) => {
        handleResponse(res, { data: getPagingResults(data, page, limit) })
      }).catch(error => {
        handleError(error, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Get industry by id
exports.findOne = async (req, res) => {
  try {
    Industry.findByPk(req.params.id, {})
      .then((data) => {
        handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} })
      }).catch(error => {
        handleError(error, req, res)
      })
  } catch (error) {
    handleError(error.req, res)
  }
}

//Update industry by id
exports.update = async (req, res) => {

  const { error } = updateIndustrySchema.validate(req.body,)

  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    Industry.update(req.body, { where: { id: req.params.id } })
      .then(data => {
        data[0] == 1 ? handleResponse(res, { message: strings.IndustryUpdated }) :
          handleError(strings.IndustryNotFound, req, res)
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Delete industry by id
exports.delete = async (req, res) => {
  try {
    Industry.destroy({ where: { id: req.params.id } })
      .then(data => {
        data == 1 ? handleResponse(res, { message: strings.IndustryDeleted }) :
          handleError(strings.IndustryNotFound, req, res)
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}