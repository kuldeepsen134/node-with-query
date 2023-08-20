//Import models database
const { Course, Question, Assignment, QuestionOption, sequelize, CourseResult, AssignmentAudience, AssignmentsEvent } = require('app/models')

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData,
  prefixTableName,
  createAssignmentEvent,
  checkAssignmentCourse,
  getTimeTwoDate
} = require('app/utils')

/**
 * Export an asynchronous function named `findAll`
 * Get all Course with filters, search, sorting and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = async (req, res) => {
  try {
    const course = await checkAssignmentCourse({ assignment_id: req.params.assignment_id, course_id: req.params.id, req: req, res: res })
    
    if (course) {
      // Retrieve page number and number of items per page from the request query parameters
      const { page, per_page } = req.query;

      // Use the getPagination function to calculate the limit and offset for the database query
      const { limit, offset } = getPagination(page, per_page);

      // Retrieve the sorting data from the request
      const sortResponse = sortingData(req);

      const query = await sequelize.query(`
        SELECT *
        FROM 
          ${prefixTableName('training_assignment_courses')}
        WHERE 
          assignment_id in (
            SELECT
              a.id
            FROM 
              ${prefixTableName('training_assignments')} as a,
              ${prefixTableName('assignment_email_logs')} as b 
            WHERE
              b.user_id = '${req.headers.user_id}'
          )
      `)

      const courses = await Course.findAndCountAll({
        order: [[sortResponse.sortKey, sortResponse.sortValue]],
        limit,
        offset,
        where: { id: query[0].map((item) => item.course_id) }
      });

      handleResponse(res, { data: getPagingResults(courses, page, limit) })
    } else {
      handleError(strings.CourseNotFound, req, res)
    }
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}

exports.findAllTraining = async (req, res) => {
  try {
    // Retrieve page number and number of items per page from the request query parameters
    const { page, per_page } = req.query;

    // Use the getPagination function to calculate the limit and offset for the database query
    const { limit, offset } = getPagination(page, per_page);

    // Retrieve the sorting data from the request
    const sortResponse = sortingData(req);

    const query = await sequelize.query(`
    SELECT *
      FROM "${prefixTableName('training_assignments')}"
      where id in (select assignment_id FROM "${prefixTableName('assignment_email_logs')}" where user_id = '${req.headers.user_id}'
)
    `)

    const trainings = await Assignment.findAndCountAll({
      order: [[sortResponse.sortKey, sortResponse.sortValue]],
      limit,
      offset,
      where: { id: query[0].map((item) => item.id) }
    });

    handleResponse(res, { data: getPagingResults(trainings, page, limit) })

  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}

exports.findTrainingCourse = async (req, res) => {
  try {
   
      // Retrieve page number and number of items per page from the request query parameters
      const { page, per_page } = req.query;

      // Use the getPagination function to calculate the limit and offset for the database query
      const { limit, offset } = getPagination(page, per_page);

      // Retrieve the sorting data from the request
      const sortResponse = sortingData(req);

      const query = await sequelize.query(`
      SELECT 
        assignment_id, course_id, due_date
      FROM 
        "${prefixTableName('training_assignment_courses')}"
      WHERE 
        assignment_id IN
        (
          SELECT 
            assignment_id
          FROM
            "${prefixTableName('assignment_email_logs')}"
          WHERE 
            user_id = '${req.headers.user_id}'
        )
      `)
/*
      SELECT 
        assignment_id, course_id
      FROM 
      ps_training_assignment_courses
      WHERE 
        assignment_id IN
        (
          SELECT 
            assignment_id
          FROM
          ps_assignment_email_logs
          WHERE 
            user_id = '2054a2d4-b94b-48d4-8774-6162dac8f033'
        )*/

      const trainings = await Course.findAll({
        order: [[sortResponse.sortKey, sortResponse.sortValue]],
        limit,
        offset,
        // attributes: {
        //   include: [
        //     [
        //       sequelize.literal(`(
        //       SELECT array_agg(
        //         json_build_object(
        //           'media_id', b."id",
        //           'entity_id', b."entity_id",
        //           'path', b."path",
        //           'company_id', a."id"
        //         )
        //       )
        //       FROM 
        //         ${prefixTableName('companies')} AS a
        //       INNER JOIN 
        //         ${prefixTableName('media')} AS b ON a.id = b.entity_id
        //       WHERE 
        //         a.id = '5cfe5e21-e291-48d8-ac10-f934da9ce637'
        //       )`),'image'
        //     ]
        //   ]
        // }
        attributes: { exclude: ['video_title', 'video_url'] },
        where: { id: query[0].map((item) => item.course_id) },
        raw: true,
      });

      let finalCourses = []

      for (let index = 0; index < query[0].length; index++) {
        const element = query[0][index];

        const course = trainings.find((item) => item.id == element.course_id)

        finalCourses.push({ ...course, assignment_id: element.assignment_id, due_date: element.due_date })
      }

      handleResponse(res, { data: finalCourses })
   
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}

exports.findOne = async (req, res) => {
  try {
    const course = await checkAssignmentCourse({ assignment_id: req.params.assignment_id, course_id: req.params.id, req: req, res: res })
    if (course) {
      Course.findByPk(req.params.id, {
        attributes: { exclude: ['video_title', 'video_url', 'company_id', 'status', 'language'] }
      })
        .then(async (data) => {
          // Prepare the response with the course data or an empty object if data is not found
          handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} })
        }).catch(error => {
          // Handle any error that occurred during the retrieval process
          handleError(error, req, res)
        })
    } else {
      handleError(strings.CourseNotFound, req, res)
    }
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}

exports.findVedio = async (req, res) => {
  try {
    const course = await checkAssignmentCourse({ assignment_id: req.params.assignment_id, course_id: req.params.id, req: req, res: res })
    if (course) {

      await createAssignmentEvent({ assignment_id: req.params.assignment_id, course_id: req.params.id, event: 'start', req: req, res: res })

      Course.findByPk(req.params.id, {
        attributes: ['video_title', 'video_url', 'html_content']
      })
        .then(async (data) => {
          // Prepare the response with the course data or an empty object if data is not found
          handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} })
        }).catch(error => {
          // Handle any error that occurred during the retrieval process
          handleError(error, req, res)
        })
    } else {
      handleError(strings.CourseNotFound, req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `findAll`
 * Get all Course with filters, search, sorting and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.getCourseQuestions = async (req, res) => {
  try {
    const course = await checkAssignmentCourse({ assignment_id: req.params.assignment_id, course_id: req.params.id, req: req, res: res })
    if (course) {

      const { page, per_page } = req.query;
      const { limit, offset } = getPagination(page, per_page)
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
    } else {
      handleError(strings.CourseNotFound, req, res)
    }
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res)
  }
}

exports.createCourseResult = async (req, res) => {

  try {

    const course = await checkAssignmentCourse({ assignment_id: req.params.assignment_id, course_id: req.params.id, req: req, res: res })
    if (course) {

      const submission = CourseResult.findOne({ where: { course_id: req.params.id, user_id: req.headers.user_id }, raw: true })

      if (submission) {
        await CourseResult.destroy({ where: { course_id: req.params.id, user_id: req.headers.user_id } })
      }

      const data = req.body.map((item) => ({
        course_id: req.params.id,
        user_id: req.headers.user_id,
        question_id: item.question_id,
        answer_id: item.answer_id,
        assignment_id: req.params.assignment_id
      }))

      const result = await CourseResult.bulkCreate(data)

      handleResponse(res, { data: result, message: strings.CourseResult })
    } else {
      handleError(strings.CourseNotFound, req, res)
    }

  } catch (error) {
    handleError(error, req, res)
  }
}

exports.getCourseResult = async (req, res) => {
  try {

    const course = await checkAssignmentCourse({ assignment_id: req.params.assignment_id, course_id: req.params.id, req: req, res: res })
    if (course) {

      const data = await CourseResult.findAll({ where: { course_id: req.params.id, user_id: req.headers.user_id }, raw: true })
      let score = 0
      let total = 0

      const course = await Course.findOne({ where: { id: req.params.id }, raw: true })

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

      const start = await AssignmentsEvent.findOne({ where: { course_id: req.params.id, assignment_id: req.params.assignment_id, user_id: req.headers.user_id }, raw: true })
      
      const convertedScore = Math.round((score / total) * 100);
      const convertedTotal = 100;

      const completed = await createAssignmentEvent({ assignment_id: req.params.assignment_id, course_id: req.params.id, event: 'completed', note: convertedScore, req: req, res: res })

      handleResponse(res, {
        data: {
          score: convertedScore || 0,
          total: convertedTotal,
          pass: course.passing_score >= convertedScore ? false : true,
          no_of_questions: total,
          no_of_correct: score,
          time_taken: getTimeTwoDate(start.created_at, completed.dataValues.created_at),
          message: course.passing_score >= convertedScore ? strings.CourseFailed :strings.CoursePass
        }
      })
    } else {
      handleError(strings.CourseNotFound, req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.getCourseQuestionsReview = async (req, res) => {
  try {

    const course = await checkAssignmentCourse({ assignment_id: req.params.assignment_id, course_id: req.params.id, req: req, res: res })
    if (course) {

      const data = await CourseResult.findAll({ where: { course_id: req.params.id, user_id: req.headers.user_id }, raw: true })

      let arr = []

      for (let index = 0; index < data.length; index++) {
        const element = data[index];
        const question = await Question.findOne({
          where: { id: element.question_id },
          include: [
            {
              model: QuestionOption,
              as: 'options',
              where: { id: element.answer_id }
            }
          ], raw: true
        });

        arr.push({
          question_id: question.id,
          answer_id: element.answer_id,
          correct: question['options.correct']
        })
      }

      handleResponse(res, { data: { item: arr } })
    } else {
      handleError(strings.CourseNotFound, req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }
}