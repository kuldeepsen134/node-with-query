//Import models database
const { Course, Company, CourseResult, sequelize, Question, QuestionOption, Assignment, News, TagRelationship } = require('app/models')

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData,
  prefixTableName
} = require('app/utils')

//Import handleSearchAndFilters function
const { handleSearchAndFilters, queryFilter } = require('../helper')

//Import validation schemas
const { createCourseSchema, updateCourseSchema, createCourseResultSchema, createQuestionSchema, createNewsSchema } = require('./validator')
const { Op } = require('sequelize')

/**
 * Export an asynchronous function named `create`
 * Create course
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {

  // Validate the request body using createCourseSchema
  const { error } = createCourseSchema.validate(req.body,)

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    // Destructure the required fields from the request body
    const {
      title,
      passing_score,
      duration,
      course_type,
      description,
      video_url,
      language,
      status,
      video_title,
      html_content
    } = req.body

    const company_id = req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id
    // Prepare the data to be inserted into the database
    const data = {
      title,
      passing_score,
      duration,
      description,
      course_type,
      video_url,
      status,
      language,
      company_id,
      video_title,
      html_content
    }

    await sequelize.transaction(async (t) => {
      // Create a new course using the Course model
      const course = await Course.create(data)

      for (let index = 0; index < req.body.questions.length; index++) {
        const element = req.body.questions[index];

        element.course_id = course.dataValues.id

        const createQuestion = await Question.create(element, { transaction: t })

        const options = element.options.map((item) => ({
          label: item.label,
          correct: item.correct || false,
          description: item.description || '',
          question_id: createQuestion.dataValues.id
        }))

        await QuestionOption.bulkCreate(options, { transaction: t })

      }
      const tags = req.body.tag_ids.map((item) => ({
        tag_id: item,
        entity_id: course.dataValues.id
      }))

      await TagRelationship.bulkCreate(tags)

      handleResponse(res, { data: course, message: strings.CourseCreated })
    })
  } catch (error) {
    // Handle any other errors that occurred during the execution
    handleError(error, req, res)
  }

}

/**
 * Export an asynchronous function named `findAll`
 * Get all Course with filters, search, sorting and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = (req, res) => {
  try {
    // Extract the page and per_page query parameters from the request
    const { page, per_page } = req.query;

    // Get the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page)

    // Get the sorting parameters for the query
    const sortResponse = sortingData(req)

    // Find and count all course with applied filters, sorting, limit, and offset
    Course.findAndCountAll(
      {
        where: {
          [Op.and]: [
            handleSearchAndFilters(req, ['title']), // Apply search and filter conditions
            req?.query?.filters?.tag_ids && queryFilter(req) && sequelize.literal(`
              EXISTS (
                SELECT 1
                FROM "${prefixTableName('tags_relationships')}" AS a
                WHERE a.entity_id = "courses".id
                AND a.tag_id IN (${queryFilter(req)})
              )
            `),
          ],
        }, // Apply search and filter conditions
        order: [[sortResponse.sortKey, sortResponse.sortValue]], // Apply sorting
        limit, offset,
        include: [
          {
            model: Company
          }
        ],
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
                  FROM "${prefixTableName('courses')}" AS a
                  INNER JOIN "${prefixTableName('tags_relationships')}" AS b ON a.id =b.entity_id
                  INNER JOIN "${prefixTableName('tags')}" AS c ON c.id =b.tag_id
                  WHERE a.id = "courses".id
                )
              `),
              'tag_ids'
            ],
            [
              sequelize.literal(`(
                SELECT array_agg(
                  json_build_object(
                    'media_id', b."id",
                    'entity_id', b."entity_id",
                    'path', b."path",
                    'key', b."key",
                    'course_id', a."id"
                  )
                )
                FROM "${prefixTableName('courses')}" AS a
                INNER JOIN "${prefixTableName('media')}" AS b ON a.id = b.entity_id
                WHERE a.id = "courses".id
              )`),
              'media'
            ]
          ]
        }
      }
    )
      .then((data) => {
        // Prepare the response data with pagination information
        handleResponse(res, { data: getPagingResults(data, page, limit) })
      }).catch(error => {
        // Handle any error that occurred during the retrieval process
        handleError(error, req, res)
      })
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `findOne`
 * Get by course ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findOne = async (req, res) => {
  try {
    // Find a campaign by its primary key (id)
    Course.findByPk(req.params.id, {
      // Include associated models: Company
      include: [
        {
          model: Company,
          attributes: ['id', 'company_name']
        },
        {
          model: Question,
          attributes: ['id', 'title', 'description'],
          include: [
            {
              model: QuestionOption,
              as: 'options'
            }
          ]
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
          FROM "${prefixTableName('courses')}" AS a
          JOIN "${prefixTableName('tags_relationships')}" AS b ON a.id = b.entity_id 
          LEFT JOIN "${prefixTableName('tags')}" AS c ON c.id = b.tag_id
          WHERE b.entity_id = '${req.params.id}'
          )`), 'tag_ids'],
          [
            sequelize.literal(`(
              SELECT array_agg(
                json_build_object(
                  'media_id', b."id",
                  'entity_id', b."entity_id",
                  'path', b."path",
                  'key', b."key",
                  'course_id', a."id"
                )
              )
              FROM "${prefixTableName('courses')}" AS a
              INNER JOIN "${prefixTableName('media')}" AS b ON a.id = b.entity_id
              WHERE a.id = '${req.params.id}'
            )`),
            'media'
          ]
        ]
      }
    })
      .then(async (data) => {
        // Prepare the response with the course data or an empty object if data is not found
        handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} })
      }).catch(error => {
        // Handle any error that occurred during the retrieval process
        handleError(error, req, res)
      })
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `update`
 * Update course by id
 * @param req - The request object.
 * @param res - The response object.
 */
exports.update = async (req, res) => {
  // Validate the request body using updateCourseSchema
  const { error } = updateCourseSchema.validate(req.body)

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res)
    return
  }

  try {

    const course = await sequelize.transaction(async (t) => {
      const updateCourse = await Course.update(req.body, { where: { id: req.params.id } }, { transaction: t })



      await TagRelationship.destroy({ where: { entity_id: req.params.id } }, { transaction: t })

      for (let index = 0; index < req.body.questions.length; index++) {
        const element = req.body.questions[index];

        element.id && await Question.destroy({ where: { id: element.id } }, { transaction: t })
        element.course_id = req.params.id

        const optionIds = element.options.map((option) => option.id)

        await QuestionOption.destroy({ where: { id: optionIds } }, { transaction: t })

        const createQuestion = await Question.create(element, { transaction: t })

        const options = element.options.map((item) => ({
          label: item.label,
          correct: item.correct || false,
          description: item.description || '',
          question_id: createQuestion.dataValues.id
        }))

        await QuestionOption.bulkCreate(options, { transaction: t })

      }
      const tags = req.body.tag_ids.map((item) => ({
        tag_id: item.tag_id ? item.tag_id : item,
        entity_id: req.params.id
      }))

      await TagRelationship.bulkCreate(tags)

      handleResponse(res, { message: strings.CourseUpdated })

    }).catch((error) => {
      handleError(error, req, res)
    })
  } catch (error) {
    // Handle any other errors that occur
    handleError(error, req, res)
  }
}


/**
 * Export an asynchronous function named `delete`
 * Delete course by ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.delete = async (req, res) => {
  try {
    const course = await sequelize.transaction(async (t) => {
      const questionIds = await Question.findAll({ where: { course_id: req.params.id }, attributes: ['id'], raw: true })

      await QuestionOption.destroy({ where: { question_id: questionIds.map((item) => item.id) } }, { transaction: t })

      await Question.destroy({ where: { course_id: req.params.id } }, { transaction: t })

      const data = await Course.destroy({ where: { id: req.params.id } }, { transaction: t })

      return data
    }).catch((error) => {
      handleError(error, req, res)
    })
    handleResponse(res, { message: course === 1 ? strings.CourseDeleted : strings.CourseNotFound }) // If the delete was successful, send a success response

  } catch (error) {
    // Handle any other errors that occur
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `create`
 * Create course
 * @param req - The request object.
 * @param res - The response object.
 */
exports.createCourseQuestion = async (req, res) => {

  // Validate the request body using createCourseSchema
  const { error } = createQuestionSchema.validate(req.body,)

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res)
    return
  }

  try {

    // Create a new course using the Course model
    const question = await sequelize.transaction(async (t) => {

      for (let index = 0; index < req.body.length; index++) {
        const element = req.body[index];

        element.course_id = req.params.id

        const createQuestion = await Question.create(element, { transaction: t })

        const options = element.options.map((item) => ({
          label: item.label,
          correct: item.correct || false,
          description: item.description || '',
          question_id: createQuestion.dataValues.id
        }))

        await QuestionOption.bulkCreate(options, { transaction: t })
      }
    })
    // Handle the successful response with the created course data
    handleResponse(res, { data: question, message: strings.QuestionCreated })
  } catch (error) {
    // Handle any other errors that occurred during the execution
    handleError(error, req, res)
  }

}

/**
 * Export an asynchronous function named `findAll`
 * Get all Course with filters, search, sorting and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.getCourseQuestions = (req, res) => {
  try {
    // Extract the page and per_page query parameters from the request
    const { page, per_page } = req.query;

    // Get the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page)

    // Get the sorting parameters for the query
    const sortResponse = sortingData(req)

    // Find and count all course with applied filters, sorting, limit, and offset
    Question.findAndCountAll(
      {
        where: { course_id: req.params.id },
        order: [[sortResponse.sortKey, sortResponse.sortValue]], // Apply sorting
        limit, offset,
        include: [
          {
            model: QuestionOption,
            attributes: ['id', 'label', 'description'],
            as: 'options'
          }
        ]
      }
    )
      .then((data) => {
        // Prepare the response data with pagination information
        handleResponse(res, { data: getPagingResults(data, page, limit) })
      }).catch(error => {
        // Handle any error that occurred during the retrieval process
        handleError(error, req, res)
      })
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}

exports.createCourseResult = async (req, res) => {
  const { error } = createCourseResultSchema.validate(req.body)

  if (error) {
    handleError(error, req, res)
    return;
  }

  const data = req.body.map((item) => ({
    course_id: req.params.id,
    user_id: req.headers.user_id,
    question_id: item.question_id,
    answer_id: item.answer_id
  }))

  const result = await CourseResult.bulkCreate(data)

  handleResponse(res, { data: result, message: strings.CourseResult })
}

exports.getCourseResult = async (req, res) => {
  const data = await CourseResult.findAll({ where: { course_id: req.params.id, user_id: req.headers.user_id }, raw: true })
  let score = 0
  let total = 0

  for (let index = 0; index < data.length; index++) {
    const element = data[index];

    const question = await Question.findOne({
      where: { id: element.question_id },
      include: [
        {
          model: QuestionOption,
          as: 'options',
          where: { id: element.answer_id, correct: true }
        }
      ]
    });

    if (question?.dataValues?.id) {
      score++;
      total++;
    } else {
      total++;
    }
  }

  handleResponse(res, { data: { score: score, total: total } })
}

exports.assignCourseUser = async (req, res) => {

  const {
    course_id,
    user_id,
    score,
    status,
    completed_date,
    useragent,
    ip,
    campaign_id,
    due_date
  } = req.body

  // Prepare the data to be inserted into the database
  const data = {
    course_id,
    user_id,
    score,
    status,
    completed_date,
    useragent,
    ip,
    campaign_id,
    due_date,
    assign_by: req.headers.user_id
  }
  const result = await Assignment.create(data)

  handleResponse(res, { data: result })
}

exports.createNews = async (req, res) => {

  const { error } = createNewsSchema.validate(req.body)

  if (error) {
    handleError(error, req, res)
    return
  }

  const {
    title,
    html_content,
    short_description,
    link
  } = req.body

  const data = {
    title,
    html_content,
    short_description,
    link
  }

  News.create(data).then((data) => {
    handleResponse(res, { data: data, message: strings.CreateNews })
  }).catch((error) => {
    handleError(error, req, res)
  })
}

exports.deleteQuestion = async (req, res) => {

}