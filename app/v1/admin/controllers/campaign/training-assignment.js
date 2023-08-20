// Import 'Op' object provides operators for Sequelize queries
const { Op } = require('sequelize')

//Import models database
const {
  sequelize,
  TagRelationship,
  Assignment,
  AssignmentAudience,
  EmailTemplateTraining,
  AssignmentCourse,
  Company,
  SendingProfile,
  Domain,
  AssignmentEmailLog,
  User,
  Course
} = require('app/models')

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  getPagingResults,
  sortingData,
  prefixTableName,
  getDay,
  createAssignmentEmailLog,
  convertMilitaryTimeToTimeZone
} = require('app/utils')

//Import handleSearchAndFilters function
const { handleSearchAndFilters } = require('../helper')

//Import validation schemas
const { createTrainingSchema } = require('./validator')

/**
 * Export an asynchronous function named `create`
 * Create campaign
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {
  try {
    // Validate the request body using the createCampaignSchema
    const { error } = createTrainingSchema.validate(req.body);

    // If there is a validation error, handle it and return
    if (error) {
      throw error;
    }

    // Destructure the required fields from the request body
    const {
      training_name,
      language,
      status,
      start_date,
      start_time,
      description,
      sending_profile_id,
      time_zone,
      days,
      due_date
    } = req.body;

    // Prepare the data to be inserted into the database
    const data = {
      training_name,
      language,
      status,
      start_date,
      start_time: convertMilitaryTimeToTimeZone(start_time, time_zone),
      description,
      assign_by: req.headers.role === 'super_administrator' ? req.body.user_id : req.headers.user_id,
      company_id: req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id,
      sending_profile_id,
      time_zone,
      days,
      due_date
    };

    // Use a transaction to ensure atomicity (all or nothing) while creating campaign and its associated data
    const training = await sequelize.transaction(async (t) => {
      // Create the campaign record in the Campaign table
      const createdTraining = await Assignment.create(data, { transaction: t });

      // Prepare the audience data to be inserted into the CampaignAudience table
      const audienceData = req.body.audience.map((item) => ({
        assignment_id: createdTraining.id,
        exclude_list: item.exclude_list.length > 0 ? item.exclude_list.join(', ') : null,
        audience_type: item.audience_type,
        audience_group_id: item.audience_group_id ? item.audience_group_id : null
      }));

      // Bulk create the audience records in the CampaignAudience table
      const dd = await AssignmentAudience.bulkCreate(audienceData, { transaction: t });

      const notifications = req?.body?.notifications?.map((item) => ({
        type: item.type,
        html_content: item.html_content,
        training_assign_id: createdTraining.id,
        from_name: req.body.from_name,
        from_email: req.body.from_email
      }))

      const course = req.body.course_ids.map((item) => ({
        assignment_id: createdTraining.id,
        course_id: item,
        due_date: due_date
      }))

      await AssignmentCourse.bulkCreate(course)

      await EmailTemplateTraining.bulkCreate(notifications, { transaction: t })

      const tags = req.body.tag_ids?.map((item) => ({
        tag_id: item,
        entity_id: createdTraining.id
      }));

      await TagRelationship.bulkCreate(tags, { transaction: t });

      // Return the created campaign
      return createdTraining;
    });

    if (status === 'active') {
      await createAssignmentEmailLog(training.id, req, res)
    }

    // Handle the successful response with the created campaign data
    handleResponse(res, { data: training, message: strings.CreatedTraining });
  } catch (error) {
    // Handle any errors that occurred during the execution
    handleError(error, req, res);
  }
};

exports.getAll = async (req, res) => {
  try {
    // Extract the page and per_page query parameters from the request
    const { page, per_page } = req.query;

    // Get the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page)

    // Get the sorting parameters for the query
    const sortResponse = sortingData(req)

    // Find and count all Assignment with applied filters, sorting, limit, and offset
    Assignment.findAndCountAll(
      {
        where: handleSearchAndFilters(req, ['training_name']),
        order: [[sortResponse.sortKey, sortResponse.sortValue]],  // Apply sorting
        limit, offset
      }
    )
      .then(async (data) => {
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

exports.findOne = async (req, res) => {
  try {
    let where;
    if (!(req.headers.role === 'super_administrator')) {
      where = {
        [Op.or]: [
          { company_id: req.headers.company_id }
        ]
      };
    }

    Assignment.findOne({
      where: { id: req.params.id, ...where },
      include: [
        {
          model: Company
        },
        {
          model: SendingProfile
        }
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT array_agg(
                json_build_object(
                  'assignment_id', a."assignment_id",
                  'exclude_list', a."exclude_list",
                  'audience_type', a."audience_type",
                  'audience_group_id', a."audience_group_id"
                )
              )
              FROM "${prefixTableName('training_assignment_audience')}" AS a
              WHERE a.assignment_id = '${req.params.id}'
            )`), 'audience'
          ],
          [
            sequelize.literal(`(
              SELECT array_agg(
                json_build_object(
                  'assignment_id', a."assignment_id",
                  'id', a."course_id",
                  'due_date', a."due_date",
                  'course_title', b."title",
                  'duration', b."duration"
                )
              )
              FROM 
              "${prefixTableName('training_assignment_courses')}" AS a,
              ${prefixTableName('courses')} AS b
              WHERE 
              a.assignment_id = '${req.params.id}'
              AND 
              a.course_id = b.id
            )`), 'course_ids'
          ],
          [
            sequelize.literal(`(
              SELECT array_agg(
                json_build_object(
                  'training_assign_id', a."training_assign_id",
                  'days', a."days",
                  'time_zone', a."time_zone",
                  'type', a."type",
                  'html_content', a."html_content",
                  'from_name', a."from_name",
                  'from_email', a."from_email"
                )
              )
              FROM "${prefixTableName('email_template_trainings')}" AS a
              WHERE a.training_assign_id = '${req.params.id}'
            )`), 'notifications'
          ],
          [sequelize.literal(`(
            SELECT array_agg( 
              json_build_object(
              'tag_id', b."tag_id",
              'title', c."title"
            ))
          FROM "${prefixTableName('training_assignments')}" AS a 
          JOIN "${prefixTableName('tags_relationships')}" AS b ON a.id = b.entity_id 
          LEFT JOIN "${prefixTableName('tags')}" AS c ON c.id = b.tag_id
          WHERE b.entity_id = '${req.params.id}'
          )`), 'tag_ids'], // Get cmapaign tags by entity ID and tag ID
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM "${prefixTableName('assignment_email_logs')}" AS a
              JOIN "${prefixTableName('training_assignments')}" AS b ON b.id = a.assignment_id
              WHERE b.id = '${req.params.id}'
              GROUP BY b.id
            )`),
            'total_target'
          ]
        ]
      }
    }).then((data) => {
      handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} });
    })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.update = async (req, res) => {
  try {
    let where;
    if (req.headers.role !== 'super_administrator') {
      where = { company_id: req.headers.company_id };
    }

    // Destructure the required fields from the request body
    const {
      training_name,
      language,
      status,
      start_date,
      start_time,
      due_date,
      description,
      sending_profile_id,
      time_zone,
      days
    } = req.body;

    // Prepare the data to be inserted into the database
    const data = {
      training_name,
      language,
      status,
      start_date,
      start_time: convertMilitaryTimeToTimeZone(start_time, time_zone),
      description,
      assign_by: req.headers.role === 'super_administrator' ? req.body.user_id : req.headers.user_id,
      company_id: req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id,
      due_date,
      sending_profile_id,
      time_zone,
      days
    };

    const campaign = await sequelize.transaction(async (t) => {
      // Update campaign by Id
      await Assignment.update(data, { where: { id: req.params.id, ...where }, transaction: t });

      // Delete campaign audience by campaign ID
      const audience = req?.body?.audience?.map((item) => {
        return {
          assignment_id: req.params.id,
          exclude_list: item.exclude_list?.length > 0 ? item.exclude_list.join(', ') : null,
          audience_type: item.audience_type,
          audience_group_id: item.audience_group_id ? item.audience_group_id : null,
        };
      });

      // Prepare the audience data to be inserted into the CampaignAudience table

      // Bulk create the audience records in the CampaignAudience table
      if (audience && audience?.length > 0) {
        await AssignmentAudience.destroy({ where: { assignment_id: req.params.id }, transaction: t });
        await AssignmentAudience.bulkCreate(audience, { transaction: t });
      }

      const AssignmentCourses = req?.body?.course_ids?.map((item) => ({
        assignment_id: req.params.id,
        course_id: item,
        due_date: due_date
      }))

      if (AssignmentCourses?.length > 0) {
        await AssignmentCourse.destroy({ where: { assignment_id: req.params.id }, transaction: t });
        await AssignmentCourse.bulkCreate(AssignmentCourses)
      }

      const notifications = req?.body?.notifications?.map((item) => ({
        type: item.type,
        html_content: item.html_content,
        training_assign_id: req.params.id,
        days: req.body.days || null,
        from_name: req.body.from_name,
        from_email: req.body.from_email
      }))

      if (notifications?.length > 0) {
        await EmailTemplateTraining.destroy({ where: { training_assign_id: req.params.id }, transaction: t });
        await EmailTemplateTraining.bulkCreate(notifications, { transaction: t })
      }

      const tags = req?.body?.tag_ids?.map((item) => ({
        tag_id: item.tag_id ? item.tag_id : item,
        entity_id: req.params.id,
      }));

      if (tags && tags.length > 0) {
        await TagRelationship.destroy({ where: { entity_id: req.params.id }, transaction: t });
        await TagRelationship.bulkCreate(tags, { transaction: t });
      }

      // Check if the update was successful
      handleResponse(res, { message: strings.TrainingUpdate });
    });
  } catch (error) {
    console.log('error :>> ', error);
    // Handles any errors that occur in the try block
    handleError(error, req, res);
  }
};

exports.count = async (req, res) => {
  try {

    const total = await AssignmentEmailLog.count({ // https://sebhastian.com/sequelize-count
      where: { assignment_id: req.params.id }
    });

    const data = await sequelize.query(`
    SELECT
      COUNT(*),
      a.event
    FROM 
      ${prefixTableName('assignments_events')} AS a
    WHERE
      a.assignment_id = '${req.params.id}'
    GROUP BY a.event
  `)

    handleResponse(res, {
      data: {
        total: total,
        start: data[0]?.find((item) => item.event === 'start')?.count || 0,
        completed: data[0]?.find((item) => item.event === 'completed')?.count || 0
      }
    })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.assignmentEmailLog = async (req, res) => {
  const { page, per_page } = req.query;

  // Get the limit and offset values for pagination
  const { limit, offset } = getPagination(page, per_page)

  // Get the sorting parameters for the query
  const sortResponse = sortingData(req)

  AssignmentEmailLog.findAndCountAll({
    where: { assignment_id: req.params.id },
    order: [[sortResponse.sortKey, sortResponse.sortValue]],  // Apply sorting
    limit, offset,
    attributes: {
      exclude: ['assignment_id', 'user_id', 'note', 'email_content', 'placeholders', 'email_template'],
      include: [
        [sequelize.literal(`(
          SELECT array_agg( 
            json_build_object(
            'assignment_id', b.assignment_id,
            'event', b.event,
            'course_id', b.course_id,
            'created_at', b.created_at,
            'score', b.note
          ))
        FROM 
          ${prefixTableName('assignments_events')} AS b 
        WHERE 
          b.assignment_id = '${req.params.id}'
        AND
          b.user_id = assignment_email_logs.user_id
        )`),
          'events']
      ]
    }
  }).then((data) => {
    handleResponse(res, { data: getPagingResults(data, page, limit) })
  })
}

exports.createAssignmentEmailLogData = async (req, res) => {

  const training = await Assignment.findOne({ where: { id: req.params.id } })
  if (training) {
    const emailTemplate = await EmailTemplateTraining.findOne({
      where: {
        training_assign_id: training.id, type: 'enrollment'
      }
    })

    const courses = await AssignmentCourse.findAll({ where: { assignment_id: training.id }, raw: true })

    const courseIds = courses.map((item) => { return item.course_id })

    const coursesData = await Course.findAll({ where: { id: courseIds }, raw: true })

    let htmlContent = []

    const htmlTemplate = `<!doctype html>
    <html lang="en">
    
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>PhishSentinel</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
      <link rel="stylesheet" href="assets/css/style.css">
    </head>
    
    
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@100;200;300;400;500;600;700;800;900&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
    
      body {
        background: #F6F6F7;
      }
    
      .brand-logo {
        margin-top: 42px;
        margin-left: 32px;
      }
    
      h3 {
        color: #33303cde;
        font-family: 'Public Sans', sans-serif;
        font-weight: 600;
        font-size: 20px;
        margin-bottom: 20px;
      }
    
      h4 {
        color: #33303cde;
        font-family: 'Public Sans', sans-serif;
        font-weight: 600;
        font-size: 16px;
      }
    
      p {
        font-family: 'Poppins', sans-serif;
        font-size: 15px;
        font-weight: 400;
        line-height: 23px;
        color: #797979;
      }
    
      .verify-email-button {
        background: #7367F0;
        border: 0px;
        text-transform: uppercase;
        font-weight: 500;
        font-size: 15px;
        width: 150px;
        height: 48px;
        font-family: 'Public Sans';
        margin: 0 0 25px 0;
        padding: 13px 0px;
      }

      .verify-email-button:hover,
      .verify-email-button:active {
        background: #7367F0 !important;
      }
    
      strong {
        color: #797979;
        font-weight: 700;
        font-family: 'Poppins', sans-serif;
        font-size: 15px;
        line-height: 22.5px;
      }
    </style>
    
    <body class="d-flex justify-content-center align-items-center vh-100">
      <table class="table table-borderless bg-white" style="border-radius: 8px; width: 700px;
         box-shadow: 0px 0px 10px 0px #00000014; max-height: 90vh; margin: auto;">
        <thead>
          <tr>
            <th class="d-flex" style="display: flex;">
              <img src="https://piecodes.in/phishsentinel.png" width="198" height="46" alt="PhishSentinel"
                class="img-fluid brand-logo">
            </th>
          </tr>
        </thead>
    
        <tbody>
          <tr>
            <td style="padding: 40px 37px 30px 40px">
              <h3>Trainings</h3>
              <p>${emailTemplate.html_content}</p>
              {{HTML_CONTENT}}
              <a href="https://phishsentinel.netlify.app/login" class="btn btn-primary verify-email-button">Login</a>
    
              <p class="mb-0">Best regards,</p>
    
              <strong>The PhishSentinel Team</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    
    </html>
    `

    for (let j = 0; j < coursesData.length; j++) {
      const course = coursesData[j];

      htmlContent.push(`
        <table class="mb-4">
          <tr>
            <td>
              <h4 class="mb-0">${course.title}</h4>

              <p class="mb-0">${course.description}</p>

              <p class="mb-0">
                <sapn>Duration:</sapn> ${course.duration}, &nbsp;
                <sapn>Passing Score: ${course.passing_score}</sapn>
              </p>
            </td>
          </tr>
        </table>
      `)
    }
    const finalEmailContent = htmlTemplate.replace('{{HTML_CONTENT}}', htmlContent.join('')).replace('{{training_title}}', training.training_name)

    const audienceData = await AssignmentAudience.findAll({ where: { assignment_id: training.id }, raw: true })

    if (audienceData[0]?.audience_type === 'all') {

      const exclude_list = audienceData[0].exclude_list ? audienceData[0].exclude_list.split(',').map(value => value.trim()) : []
      const emailContent = finalEmailContent.replace(/'/g, "''");

      const users = await User.findAll({
        attributes: [
          ['id', 'user_id'],
          ['email', 'user_email'],
          [sequelize.fn('CONCAT', '{"first_name":"', sequelize.col('first_name'), '","last_name":"', sequelize.col('last_name'), '"}'), 'placeholders'],
          [sequelize.fn('CONCAT', '{"from_name":"', `${emailTemplate.from_name}`, '","from_email":"', `${emailTemplate.from_email}`, '","subject":"', `${training.training_name}"}`), 'email_template'],
          [sequelize.literal(`'${training.id}'`), 'assignment_id'],
          [sequelize.literal(`E'${emailContent}'`), 'email_content']
        ],
        where: sequelize.and(
          { id: { [Op.notIn]: exclude_list } },
          { status: 'active' },
          { company_id: training.company_id },
          sequelize.literal(`
            email NOT IN (
              SELECT 
                a.user_email 
              FROM 
                "${prefixTableName('assignment_email_logs')}" AS a
              WHERE 
                a."assignment_id" = '${training.id}'
            )
        `)
        ),
        raw: true
      });

      // Bulk create email logs for the users
      const data = await AssignmentEmailLog.bulkCreate(users)

      if (training.status === 'draft') {
        await Assignment.update({ status: 'active' }, { where: { id: training.id } })
      }

      handleResponse(res, { message: strings.AssignmentLaunch })

    } else if (audienceData.length > 0) {
      // Process for audience type other than 'all'
      const groupIds = audienceData.map((item) => item.audience_group_id).join("','");
      const excludeUserIds = audienceData
        .map((item) => item.exclude_list)
        .filter((value) => value !== null) // Filter out null values
        .join(",")
        .split(",")
        .map((value) => value.trim())
        .join("','");

      const emailContent = finalEmailContent.replace(/'/g, "''");

      // Fetch users from specific audience groups, excluding those in the exclude list
      const [users, metaDta] = await sequelize.query(`
      SELECT
        a.user_id,
        b.email as user_email,
        '${emailContent}' AS email_content,
        '${training.id}' as assignment_id,
        CONCAT('{"first_name":"', b.first_name, '","last_name":"', b.last_name, '"}') as placeholders,
        CONCAT('{"from_name":"', '${emailTemplate.from_name}', '","from_email":"', '${emailTemplate.from_email}', '","subject":"', '${training.training_name}','"}') AS email_template
      FROM
        "${prefixTableName('groups_relationships')}" AS a,
        "${prefixTableName('users')}" AS b
      WHERE
        a.group_id IN ('${groupIds}')
        AND
        a.user_id = b.id
        ${excludeUserIds !== '' ? `AND b.id NOT IN ('${excludeUserIds}')` : ''}
        AND
        b.email NOT IN (
          SELECT user_email
          FROM "${prefixTableName('assignment_email_logs')}"
          WHERE "assignment_id" = '${training.id}'
        )
        AND 
        b.status = 'active'
      GROUP BY
        a.user_id,
        b.email,
        b.first_name,
        b.last_name
    `);

      // Bulk create email logs for the users
      const data = await AssignmentEmailLog.bulkCreate(users)

      if (training.status === 'draft') {
        await Assignment.update({ status: 'active' }, { where: { id: training.id } })
      }

      handleResponse(res, { message: strings.AssignmentLaunch })
    }
  }

}

exports.assignmentDelete = async (req, res) => {
  try {

    await sequelize.query(`
    DELETE
    FROM ${prefixTableName('assignments_events')}
    WHERE entity_id in (SELECT id FROM ${prefixTableName('assignment_email_logs')} WHERE assignment_id = '${req.params.id}')
  `)

    await AssignmentEmailLog.destroy({ where: { assignment_id: req.params.id } })

    await AssignmentAudience.destroy({ where: { assignment_id: req.params.id } })

    const data = await Assignment.destroy({ where: { id: req.params.id } })

    handleResponse(res, { message: data === 1 ? strings.AssignmentDelete : strings.assignmentNotfound })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.getAssignmentCourses = async (req, res) => {

  const query = await sequelize.query(`
    SELECT course_id
      FROM ${prefixTableName('training_assignment_courses')}
      where assignment_id = '${req.params.id}'
    `)

  const courses = await Course.findAll({
    where: { id: query[0].map((item) => item.course_id) }
  })
  handleResponse(res, { data: { items: courses } })
}