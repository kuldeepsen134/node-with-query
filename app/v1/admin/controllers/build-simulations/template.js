const { EmailTemplate, TagRelationship, User, Company, sequelize } = require('app/models')

const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData,
  prefixTableName
} = require('app/utils')

const { handleSearchAndFilters, queryFilter } = require('../helper')
const { createEmailTemplateSchema, updateEmailTemplateSchema } = require('./validator')
const { Op } = require('sequelize')

//Create email template
exports.create = async (req, res) => {

  const { error } = createEmailTemplateSchema.validate(req.body,)

  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    const {
      title,
      html_content,
      status,
      language,
      complexity,
      descripiton,
      from_name,
      from_email,
      subject,
      category_id,
      email_headers
    } = req.body

    const { user_id } = req.headers
    const company_id = req.headers.role === 'super_administrator' ? req.body.company_id !== null ? req.body.company_id : null : req.headers.company_id

    const data = {
      title,
      html_content,
      status,
      language,
      complexity,
      descripiton,
      from_name,
      from_email,
      category_id,
      subject,
      created_by: user_id,
      email_headers,
      company_id: company_id
    }
    try {
      await sequelize.transaction(async (t) => {
        const emailTemplate = await EmailTemplate.create(data, { transaction: t })
        const tags = req?.body?.tag_ids?.map((item) => {
          return ({
            tag_id: item.tag_id ? item.tag_id : item,
            entity_id: emailTemplate.dataValues.id
          })
        })
        if (tags) {
          await TagRelationship.bulkCreate(tags)
        }
        handleResponse(res, { data: emailTemplate, message: strings.EmailTemplateCreated })
      })
    } catch (error) {
      handleError(error, req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }
}

//Get all email templates 
exports.findAll = (req, res) => {
  try {
    const { page, per_page } = req.query;
    const { limit, offset } = getPagination(page, per_page)
    const sortResponse = sortingData(req)

    EmailTemplate.findAndCountAll(
      {
        where: {
          [Op.and]: [
            handleSearchAndFilters(req, ['title', 'status']),
            req?.query?.filters?.tag_ids && queryFilter(req) && sequelize.literal(`
            EXISTS (
              SELECT 1
              FROM "${prefixTableName('tags_relationships')}" AS a
              WHERE a.entity_id = "email_templates".id
              AND a.tag_id IN (${queryFilter(req)})
            )
            `)
          ]
        },
        order: [[sortResponse.sortKey, sortResponse.sortValue]],
        limit, offset,
        attributes: {
          include: [
            [
              sequelize.literal(`
                (
                  SELECT array_agg( 
                    json_build_object(
                    'tag_id', b."tag_id",
                    'entity_id', b."entity_id",
                    'title', c."title"
                  ))
                  FROM "${prefixTableName('email_templates')}" AS a
                  INNER JOIN "${prefixTableName('tags_relationships')}" AS b ON a.id =b.entity_id
                  INNER JOIN "${prefixTableName('tags')}" AS c ON c.id =b.tag_id
                  WHERE a.id = "email_templates".id
                )
              `),
              'tag_ids'
            ]
          ]
        }
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

//Get email template by id
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

    EmailTemplate.findOne({
      where: {id: req.params.id, ...where},
      include: [
        {
          model: User
        },
        {
          model: Company
        }
      ],
      attributes: {
        include: [
          [sequelize.literal(`(
            SELECT array_agg( 
              json_build_object(
              'tag_id', b."tag_id",
              'title', c."title"
            ))
          FROM "${prefixTableName('email_templates')}" AS a
          JOIN "${prefixTableName('tags_relationships')}" AS b ON a.id = b.entity_id 
          LEFT JOIN "${prefixTableName('tags')}" AS c ON c.id = b.tag_id
          WHERE b.entity_id = '${req.params.id}'
          )`), 'tag_ids']
        ]
      }
    })
      .then(async (data) => {
        handleResponse(res, data?.dataValues ? { data: data.dataValues } : { data: {} })
      }).catch(error => {
        handleError(error, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Update  email template by id
exports.update = async (req, res) => {

  const { error } = updateEmailTemplateSchema.validate(req.body,)

  if (error) {
    handleError(error, req, res)
    return
  }

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

    await sequelize.transaction(async (t) => {
      const data = await EmailTemplate.update(req.body, { where: { id: req.params.id, ...where } }, { transaction: t })
      await TagRelationship.destroy({ where: { entity_id: req.params.id } }, { transaction: t })

      const tags = req?.body?.tag_ids?.map((item) => {
        return ({
          tag_id: item.tag_id ? item.tag_id : item,
          entity_id: req.params.id
        })
      })

      if (tags?.length > 0) {
        await TagRelationship.bulkCreate(tags, { transaction: t })
      }
      data[0] == 1 ? handleResponse(res, { message: strings.EmailTemplateUpdated }) :
        handleError(strings.EmailTemplateNotFound, req, res)

    }).catch(error => {
      handleError(error, req, res)
    })
  } catch (error) {
    handleError(error, req, res)
  }
}

//Delete  email template by id
exports.delete = async (req, res) => {
  try {
    EmailTemplate.update({ status: 'deleted' }, { where: { id: req.params.id } })
      .then(data => {
        data[0] == 1 ? handleResponse(res, { message: strings.EmailTemplateDeleted }) :
          handleError(strings.EmailTemplateNotFound, req, res)
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}
