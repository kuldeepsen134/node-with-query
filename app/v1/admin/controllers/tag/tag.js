const { Tag, sequelize, User, TagRelationship, Company } = require('app/models')

const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData,
  getSlug
} = require('app/utils')

const { handleSearchAndFilters } = require('../helper')
const { createTagSchema, updateTagSchema } = require('./validator')
const { Op } = require('sequelize')

//Create tag
exports.create = async (req, res) => {

  const { error } = createTagSchema.validate(req.body,)

  if (error) {
    handleError(error, req, res)
    return
  }

  const slug = await getSlug(req.body.slug ? req.body.slug : req.body.title)

  try {
    const {
      title,
      description
    } = req.body

    const data = {
      title,
      description,
      slug,
      company_id: req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id,
    }

    Tag.create(data)
      .then(async (data) => {
        handleResponse(res, { data: data, message: strings.TagCreated })
      }).catch(error => {
        handleError(error, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Get all tags
exports.findAll = (req, res) => {
  try {
    const { page, per_page } = req.query
    const { limit, offset } = getPagination(page, per_page)
    const sortResponse = sortingData(req)

    Tag.findAndCountAll(
      {
        where: handleSearchAndFilters(req, ['title']),
        include: [
          {
            model: Company
          }
        ],
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

//Get tag by id
exports.findOne = async (req, res) => {
  try {
    Tag.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Company
        }
      ]
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

//Update tag by id
exports.update = async (req, res) => {

  req.body.slug = await getSlug(req.body.slug ? req.body.slug : req.body.name)

  try {
    Tag.update(req.body, { where: { id: req.params.id } })
      .then(data => {
        data[0] == 1 ? handleResponse(res, { message: strings.TagUpdated }) :
          handleError(strings.TagNotFound, req, res)
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Delete tag by id
exports.delete = async (req, res) => {
  try {
    Tag.update({ status: 'deleted' }, { where: { id: req.params.id } })
      .then(data => {
        data[0] == 1 ? handleResponse(res, { message: strings.TagDeleted }) :
          handleError(strings.TagNotFound, req, res)
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}