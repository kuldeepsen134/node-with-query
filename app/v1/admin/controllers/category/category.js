const { Category, Company } = require('app/models')

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
const { createCategorySchema, updateCategorySchema } = require('./validator')

//Create category
exports.create = async (req, res) => {

  const { error } = createCategorySchema.validate(req.body,)

  if (error) {
    handleError(error, req, res)
    return
  }
  try {

    const {
      title,
      description
    } = req.body

    const slug = await getSlug(req.body.slug ? req.body.slug : title)

    const data = {
      title,
      slug,
      description,
      company_id: req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id,
    }

    Category.create(data)
      .then(async (data) => {
        handleResponse(res, { data: data, message: strings.CategoryCreated })
      }).catch(error => {
        handleError(error, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Get all categories
exports.findAll = (req, res) => {
  try {
    const { page, per_page } = req.query;
    const { limit, offset } = getPagination(page, per_page)
    const sortResponse = sortingData(req)

    Category.findAndCountAll(
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

//Get category by id
exports.findOne = async (req, res) => {
  try {
    Category.findOne({
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

//Update category by id
exports.update = async (req, res) => {

  const { error } = updateCategorySchema.validate(req.body,)

  if (error) {
    handleError(error, req, res)
    return
  }
  try {
    const {
      title,
      slug,
      description
    } = req.body

    const slugData = await getSlug(slug ? slug : title)

    const data = {
      title,
      slugData,
      description,
      company_id: req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id,
    }

    Category.update(data, { where: { id: req.params.id } })
      .then(data => {
        data[0] == 1 ? handleResponse(res, { message: strings.CategoryUpdated }) :
          handleError(strings.CategoryNotFound, req, res)
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Delete category by id
exports.delete = async (req, res) => {
  try {
    Category.destroy({ where: { id: req.params.id } })
      .then(data => {
        data == 1 ? handleResponse(res, { message: strings.CategoryDeleted }) :
          handleError(strings.CategoryNotFound, req, res)
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}