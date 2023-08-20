const { User, sequelize, Company } = require('app/models')

const { handleError, handleResponse, strings, prefixTableName } = require('app/utils')

exports.me = async (req, res) => {
  try {

    const completed = await sequelize.query(`
      SELECT 
        a.assignment_id,
        a.course_id,
        a.user_id,
        a.event,
        a.note
      FROM 
        ${prefixTableName('assignments_events')} AS a
      INNER JOIN 
        ${prefixTableName('training_assignment_courses')} AS b
        ON 
        a.assignment_id = b.assignment_id 
        AND 
        a.course_id = b.course_id
        AND 
        a.user_id = '${req.headers.user_id}'
        AND 
        a.event = 'completed'
    `, { raw: true })

    const started = await sequelize.query(`
      SELECT 
        a.assignment_id,
        a.course_id,
        a.user_id,
        a.event
      FROM 
        ${prefixTableName('assignments_events')} AS a
      INNER JOIN 
        ${prefixTableName('training_assignment_courses')} AS b
      ON 
        a.assignment_id = b.assignment_id 
        AND 
        a.course_id = b.course_id
        AND 
        a.user_id = '${req.headers.user_id}'
        AND 
        a.event = 'start'
    `, { raw: true })

    var score = 0

    for (let index = 0; index < completed[0].length; index++) {
      const element = completed[0][index];

      score += parseFloat(element.note)

      const index1 = started[0].findIndex((item) => item.course_id === element.course_id && item.assignment_id === element.assignment_id)
      if (index1 > -1) {
        started[0].splice(index1, 1)
      }
    }

    const courses = {
      completed: completed[0] || 0,
      started: started[0] || 0,
      average_score: score / completed[0]?.length || 0
    }

    await User.findOne({
      where: { id: req.headers.user_id },
      include: [{
        model: Company,
        attributes: ['company_name', 'id'],
      }],
    })
      .then(async (data) => {
        handleResponse(res, { data: { ...data.dataValues, courses: courses } })
      }).catch(error => {
        handleError(error, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.profile = async (req, res) => {

  try {
    const {
      first_name,
      last_name,
      phone_number,
      address,
      country,
      state,
      city,
      postcode,
      language,
      gender
    } = req.body

    const data = {
      first_name,
      last_name,
      phone_number,
      address,
      country,
      state,
      city,
      postcode,
      gender,
      language
    }

    User.update(data, { where: { id: req.headers.user_id } })
      .then(data => {
        handleResponse(res, { message: strings.UserUpdated })
      }).catch(err => {
        handleError(err, req, res)
      })
  } catch (error) {
    handleError(error, req, res)
  }
}