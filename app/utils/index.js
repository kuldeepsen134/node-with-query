//Handle all errors
exports.handleError = (error, req, res, userCount) => {
  let errorMessage
  this.logger.error(error, { body: req.body, path: req.path, method: req.method })
  if (error?.response?.data) {
    errorMessage = error.response.data
  } else if (error?.errors) {
    errorMessage = error?.errors[0]?.message
  } else if (error?.parent?.detail) {
    errorMessage = error.parent.detail.replace(/[{()}]/g, '').replace(/=/g, ' ')
  } else if (error?.details) {
    [errorMessage] = error.details.map((item) => {
      return item?.message.replace(/"/g, '')
        .replace(/\./g, ' ')
        // .replace(/[^\w\s-]/g, '')
        .replace(/^\w/, (c) => c.toUpperCase())

    })
  } else if (error.error) {
    errorMessage = error?.error ? error?.error?.message : error?.original?.sqlMessage
  } else {
    errorMessage = error?.ReferenceError ? error?.ReferenceError : error
  }

  res.status(400).send({
    message: errorMessage,
    error: true,
  })
  return
}

exports.getCampaignDetails = async (params) => {
  const { Campaign, EmailLog } = require('../models')

  const campaignId = await EmailLog.findOne({ where: { secret_key: params }, raw: true })
  const campaign = await Campaign.findOne({ where: { id: campaignId.campaign_id }, raw: true })

  return {
    campaign_id: campaign.id,
    success_event_type: campaign.success_event_type
  }
}

exports.getUseragentName = (useragent) => {
  const browserRegex = /(Chrome|Firefox|Safari|Edge|Opera|PostmanRuntime|UCBrowser|YandexBrowser|Maxthon|TorBrowser|PaleMoon|SeaMonkey|Avant|AOL|Konqueror|Netscape|Midori|Epiphany|Thunderbird|Bing)(?:\/|\s)(\d+)/i;
  const browserMatches = browserRegex.exec(useragent);

  if (browserMatches && browserMatches.length > 1) {
    const browserName = browserMatches[1].toLowerCase();
    switch (browserName) {
      case 'chrome':
        return 'chrome';
      case 'firefox':
        return 'firefox';
      case 'safari':
        return 'safari';
      case 'edge':
        return 'edge';
      case 'opera':
        return 'opera';
      case 'ucbrowser':
        return 'ucbrowser';
      case 'yandexbrowser':
        return 'yandexbrowser';
      case 'maxthon':
        return 'maxthon';
      case 'netscape':
        return 'netscape';
      case 'thunderbird':
        return 'thunderbird';
      case 'bing':
        return 'bing';
      default:
        return 'other';
    }
  }
};

exports.getOperatingSystem = (useragent) => {
  const osRegex = /\(([^)]+)\)/;
  const osMatches = osRegex.exec(useragent);

  if (osMatches && osMatches.length > 1) {
    const osString = osMatches[1].toLowerCase();
    switch (true) {
      case osString.includes('linux'):
        return 'linux';
      case osString.includes('windows'):
        return 'windows';
      case osString.includes('mac'):
        return 'macos';
      case osString.includes('android'):
        return 'android';
      case osString.includes('ios'):
        return 'ios';
      case osString.includes('blackberry'):
        return 'blackberry';
      case osString.includes('symbian'):
        return 'symbian';
      case osString.includes('unix'):
        return 'unix';
      case osString.includes('postmanruntime'):
        return 'other';
      default:
        return 'other';
    }
  }
};


exports.getDay = () => {
  const today = new Date()
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return daysOfWeek[today.getDay()]
}

exports.getTime = () => {
  const today = new Date();
  const hours = String(today.getHours()).padStart(2, '0');
  const minutes = String(today.getMinutes()).padStart(2, '0');
  return parseInt(hours + minutes)
}
//handle all api response
exports.handleResponse = (res, params) => {
  if (res.req.method === 'POST' || res.req.method === 'PUT' || res.req.method === 'DELETE') {
    res.status(200).send(params?.access_token ? {
      access_token: params?.access_token,
      message: params.message,
      error: false
    } : {
      data: params?.data,
      message: params.message,
      error: false
    })
    return
  } else {
    res.status(200).send(params.data)
    return
  }
}

exports.replaceEmailContentPlaceholders = (content, secret_key) => {
  return content
}
//Get pagination
exports.getPagination = (page, per_page) => {
  const limit = per_page ? +per_page : 5
  const offset = page ? (page - 1) * limit : 0

  return { limit, offset }
}

//Genrate pagination results
exports.getPagingResults = (data, page, limit) => {
  const { count: total_items, rows: items } = data
  const current_page = page ? +page : 1
  const total_pages = Math.ceil(total_items / limit)
  const per_page = limit

  return { items, pagination: { total_items, per_page, total_pages, current_page } }
}

//Sorting data
exports.sortingData = (req) => {
  const { sort } = req.query

  const sortKey = sort ? sort.replace('-', '') : 'created_at'
  const sortValue = sort ? sort.includes('-') ? 'DESC' : 'ASC' : 'DESC'

  return { sortKey, sortValue }
}

//Create slug
exports.getSlug = (name) => {

  const slug = name?.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug
}

//Create company id
exports.getCompanyId = async (params) => {
  const { Company } = require('../models')

  const matches = params?.match(/\b(\w)/g)
  const companyName = matches?.join('').toUpperCase()
  const companies = await Company.findAndCountAll()
  return companyName + (companies.count + 1)
}

//Create employee id
const { Company, User } = require('../models');

exports.getEmployeeId = async (params) => {
  const matches = params?.fullName?.match(/\b(\w)/g);
  const empolyeeName = matches?.join('').toUpperCase();

  const users = await User.findAndCountAll();
  const employeeCount = users.count + 1;

  let companyName = '';
  if (params?.company_id?.length > 0) {
    const company = await Company.findOne({ where: { id: params.company_id } });
    if (company) {
      const matches1 = company.dataValues?.company_name?.match(/\b(\w)/g);
      companyName = matches1?.join('').toUpperCase();
    }
  }

  return empolyeeName + employeeCount + companyName;
};

//Create uuid
exports.createUUID = () => {
  const { v4: uuidv4 } = require('uuid')
  return uuidv4()
}

const UserAgent = require('user-agents')
//Get device information
exports.userAgent = JSON.stringify(new UserAgent().data, null, 2)

//Email id encypted
exports.emailEncyption = (params) => {

  let hide = params.split("@")[0].length - 2
  var r = new RegExp(".{" + hide + "}@", "g")
  email = params.replace(r, "***@")

  return email
}

const winston = require('winston');
//Log all errors
exports.logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'error.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
})

exports.createCampaignEmailLog = async (campaignId, req, res) => {
  const { Campaign, EmailTemplate, Domain, CampaignAudience, User, EmailLog, sequelize } = require('app/models')
  try {

    const campaign = await Campaign.findOne({ where: { id: campaignId } })
    if (campaign) {
      const emailTemplate = await EmailTemplate.findByPk(campaign.email_template_id)

      const domain = await Domain.findByPk(campaign.domain_id)

      const audienceData = await CampaignAudience.findAll({ where: { campaign_id: campaign.id }, raw: true })

      if (audienceData[0]?.audience_type === 'all') {

        const exclude_list = audienceData[0].exclude_list ? audienceData[0].exclude_list.split(',').map(value => value.trim()) : []
        const emailContent = emailTemplate?.html_content?.replace(/'/g, "''");

        const users = await User.findAll({
          attributes: [
            ['id', 'user_id'],
            ['email', 'user_email'],
            [sequelize.fn('CONCAT', '{"first_name":"', sequelize.col('first_name'), '","last_name":"', sequelize.col('last_name'), `","url":"https://${domain?.title ? domain.title : ''}?pageid=${campaign.landing_page_id}&secret_key="}`), 'placeholders'],
            [sequelize.fn('CONCAT', '{"from_name":"', `${emailTemplate.from_name}`, '","from_email":"', `${emailTemplate.from_email}`, '","subject":"', `${emailTemplate.subject}`, '","email_headers":', `${emailTemplate.email_headers}}`), 'email_template'],
            [sequelize.literal(`'${campaign.id}'`), 'campaign_id'],
            [sequelize.literal(`E'${emailContent}'`), 'email_content']
          ],
          where: sequelize.and(
            { id: { [Op.notIn]: exclude_list } },
            { status: 'active' },
            { company_id: campaign.company_id },
            sequelize.literal
              (`
            email NOT IN (
              SELECT 
                a.user_email 
              FROM 
                "${this.prefixTableName('email_logs')}" AS a
              WHERE 
                a."campaign_id" = '${campaign.id}'
            )
        `)
          ),
          raw: true
        });

        if (campaign.status === 'active' || campaign.status === 'draft') {
          await Campaign.update({ status: 'running' }, { where: { id: campaign.id } })
        }

        // Bulk create email logs for the users
        const data = await EmailLog.bulkCreate(users)

        if (campaign.type === 'advance') {
          await sequelize.query(`
          UPDATE ${this.prefixTableName('email_logs')}
            SET status = 'schedule'
            WHERE campaign_id = '${campaign.id}'
          `)
        }

        // handleResponse(res, { message: strings.CampaignLaunch })

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

        const emailContent = emailTemplate?.html_content?.replace(/'/g, "''");

        // Fetch users from specific audience groups, excluding those in the exclude list
        const [users, metaDta] = await sequelize.query(`
      SELECT
        a.user_id,
        b.email as user_email,
        '${emailContent}' AS email_content,
        '${campaign.id}' as campaign_id,
        CONCAT('{"first_name":"', b.first_name, '","last_name":"', b.last_name, '","url":"https://${domain.title}?pageid=${campaign.landing_page_id}&secret_key="}') as placeholders,
        CONCAT('{"from_name":"', '${emailTemplate.from_name}', '","from_email":"', '${emailTemplate.from_email}', '","subject":"', '${emailTemplate.subject}', '","email_headers":', '${emailTemplate.email_headers}', '}') as email_template
      FROM
        "${this.prefixTableName('groups_relationships')}" AS a,
        "${this.prefixTableName('users')}" AS b
      WHERE
        a.group_id IN ('${groupIds}')
        AND
        a.user_id = b.id
        ${excludeUserIds !== '' ? `AND b.id NOT IN ('${excludeUserIds}')` : ''}
        AND
        b.email NOT IN (
          SELECT user_email
          FROM "${this.prefixTableName('email_logs')}"
          WHERE "campaign_id" = '${campaign.id}'
        )
        AND 
        b.status = 'active'
      GROUP BY
        a.user_id,
        b.email,
        b.first_name,
        b.last_name
    `);

        if (campaign.status === 'active' || campaign.status === 'draft') {
          await Campaign.update({ status: 'running' }, { where: { id: campaign.id } })
        }

        // Bulk create email logs for the users
        const data = await EmailLog.bulkCreate(users)

        if (campaign.type === 'advance') {
          await sequelize.query(`
          UPDATE ${this.prefixTableName('email_logs')}
            SET status = 'schedule'
            WHERE campaign_id = '${campaign.id}'
          `)
        }

        // handleResponse(res, { message: strings.CampaignLaunch })
      }
    }
  } catch (error) {
    this.handleError(error, req, res)
  }

}

exports.createAssignmentEmailLog = async (assginment_id, req, res) => {
  const { Assignment, EmailTemplateTraining, AssignmentCourse, Course, User, AssignmentAudience, sequelize, AssignmentEmailLog } = require('app/models')

  const training = await Assignment.findOne({ where: { id: assginment_id } })
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
                "${this.prefixTableName('assignment_email_logs')}" AS a
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

      // handleResponse(res, { message: strings.AssignmentLaunch })

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
        "${this.prefixTableName('groups_relationships')}" AS a,
        "${this.prefixTableName('users')}" AS b
      WHERE
        a.group_id IN ('${groupIds}')
        AND
        a.user_id = b.id
        ${excludeUserIds !== '' ? `AND b.id NOT IN ('${excludeUserIds}')` : ''}
        AND
        b.email NOT IN (
          SELECT user_email
          FROM "${this.prefixTableName('assignment_email_logs')}"
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

      // handleResponse(res, { message: strings.AssignmentLaunch })
    }
  }

}

//Create assignment event
exports.createAssignmentEvent = async (params) => {
  var ip = require('ip');

  const { AssignmentsEvent, AssignmentEmailLog } = require('../models')

  try {

    const emailLog = await AssignmentEmailLog.findOne({ where: { user_id: params.req.headers.user_id, assignment_id: params.assignment_id }, raw: true })

    const event = await AssignmentsEvent.findOne({ where: { course_id: params.course_id, assignment_id: params.assignment_id, event: params.event }, raw: true })

    if (event) {
      await AssignmentsEvent.destroy({ where: { course_id: params.course_id, assignment_id: params.assignment_id, event: params.event } })
    }
    if (emailLog) {

      const data = {
        useragent_raw: params.req.get('user-agent'), // Extract user agent from request headers
        useragent: this.getUseragentName(params.req.get('user-agent')), // Extract user agent from request headers
        os: this.getOperatingSystem(params.req.get('user-agent')), // Extract user agent from request headers
        ip: ip.address(), // Get the IP address of the client
        event: params.event, // Set the event type from the query params
        entity_id: emailLog?.id, // Set the entity ID from the query params
        course_id: params.course_id,
        assignment_id: params.assignment_id,
        user_id: params.req.headers.user_id,
        request_header: JSON.stringify(params.req.headers),
        note: params.note
      };

      // Create a new Domain instance using the data object
      const data1 = await AssignmentsEvent.create(data)
      return data1
    }
  } catch (error) {
    // Handle any other error that occurred
    this.handleError(error, params.req, params.res);
  }
}

exports.checkAssignmentCourse = async (params) => {
  const { AssignmentCourse } = require('../models')

  return await AssignmentCourse.findOne({ where: { assignment_id: params.assignment_id, course_id: params.course_id } })
}

exports.getTimeTwoDate = (startDate, endDate) => {
  var startTime = new Date(`${startDate}`);
  var endTime = new Date(`${endDate}`);
  var difference = endTime.getTime() - startTime.getTime(); // This will give difference in milliseconds
  return Math.round(difference / 60000); u
}

exports.prefixTableName = (params) => {
  return process.env.DB_TABLE_PREFIX + params
}

const https = require('https');
const axios = require('axios');
const { Op } = require('sequelize');
exports.axiosClient = async (params) => {
  const config = {
    method: params.method,
    url: params.url,
    headers: {
      'Accept': 'application/json',
      'Authorization': 'Basic ZGVoYXNoZWRAc2VudGluZWxhbGx5LmNvbTp5cWFhbGhvNnQyNGY3cGgyMzdoamtqd3JsaGZoMzZuYg=='
    }
  }

  return await axios(config)
}

exports.axiosGophishClient = async (params) => {
  try {
    const config = {
      method: params.method,
      url: params.url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': params.apiKey
      },
      data: params.data,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    }

    const data = await axios(config)
    return data.data
  } catch (error) {
    return error
  }
}

exports.getGeoLocation = async (ip) => {
  try {
    const config = {
      method: 'get',
      url: `https://api.ipgeolocation.io/ipgeo?apiKey=${process.env.GEO_LOCATION_KEY}&ip=${ip}`
    }

    const data = await axios(config)
    return data
  } catch (error) {
    return error
  }
}

exports.getTimeTwoYearAgo = (params) => {
  const firstDate = new Date(params.date);

  const twoYearsAgo = new Date(firstDate);
  twoYearsAgo.setFullYear(firstDate.getFullYear() + 2);

  const hour = parseInt(params.time.toString().substring(0, 2));
  const minute = parseInt(params.time.toString().substring(2, 4));

  twoYearsAgo.setHours(hour, minute, 0, 0);
  return new Date(twoYearsAgo.getTime())
};

exports.getCurrentDateAndTime = (params) => {
  const firstDate = new Date(params.date);

  const twoYearsAgo = new Date(firstDate);

  const hour = parseInt(params.time.toString().substring(0, 2));
  const minute = parseInt(params.time.toString().substring(2, 4));

  twoYearsAgo.setHours(hour, minute, 0, 0);
  return new Date(twoYearsAgo.getTime())
};


exports.convertMilitaryTimeToTimeZone = (militaryTime, timeZone) => {
  const moment = require('moment-timezone');
  const currentTime = moment().tz(timeZone);

  const militaryTimeUTC = moment.utc(militaryTime, 'HH:mm');

  // const combinedDateTimeUTC = moment.utc({
  //   year: currentTime.year(),
  //   month: currentTime.month(),
  //   date: currentTime.date(),
  //   hour: militaryTimeUTC.hours(),
  //   minute: militaryTimeUTC.minutes(),
  // });

  const convertedTime = militaryTimeUTC.tz(timeZone).format('HH:mm');
  return convertedTime.replace(':', '')
};

//All string messages
exports.strings = {
  //Auth
  AuthSuccessMessage: 'Logged in successfully.',
  AccountSuccessfullyCreated: 'Your account has been created successfully.',
  PassDontMatch: 'Password and confirm password should be same.',
  AlreadyUsedLink: 'This verification link has already been used',
  UserDoesnotExist: 'User does not exist in user table.',
  UnauthorizedAccess: 'Unauthorized access!',
  InvalidCode: 'Invalid code. Please make sure you use code that was sent to your email.',
  UserAccountNotActive: 'Your account is not active please contact admin',
  OtpSend: 'Your login verification code has been sent to your email.',
  CompanyNotEligible: 'You are not eligible to create company. Please contact super admin',
  Captured: 'Captured successfully',
  YourCompany: 'Your company is currently inactive/deleted',
  YourAccount: 'Your account is currently inactive/deleted',

  //User
  UserCreated: 'User successfully created',
  UserUpdated: 'User successfully updated',
  UserDeleted: 'User successfully deleted',
  UserNotFound: 'Your account is currently inactive/deleted',
  SelectUser: 'Please select a user',

  //Server error
  InternalServerError: 'An internal server error occurred. Please try again later.',

  //Course
  CourseCreated: 'Course successfully created',
  CourseUpdated: 'Course successfully updated',
  CourseDeleted: 'Course successfully deleted',
  CourseNotFound: 'Course not found',

  //Company
  CompanyCreated: 'Company successfully created',
  CompanyUpdated: 'Company successfully updated',
  CompanyDeleted: 'Company successfully deleted',
  CompanyNotFound: 'Company not found',

  //News
  CreateNews: 'News successfully created',

  //Campaign
  CampaignCreated: 'Campaign successfully created',
  CampaignUpdated: 'Campaign successfully updated',
  CampaignDeleted: 'Campaign successfully deleted',
  CampaignNotFound: 'Campaign not found',
  CampaignLaunch: 'Campaign successfully launched',
  CampaignRestart: 'Campaign successfully restart',
  CampaignStop: 'Campaign successfully stop',
  CampaignResume: 'Campaign successfully resume',
  CampaignReset: 'Campaign successfully reset',
  CampaignStart: 'Campaign successfully start',
  CampaignLaunch: 'Campaign successfully launched',
  CampaignDraft: 'Campaign successfully saved as draft',
  CampaignLaunchGophish: 'This will launch campaign at Gophish',
  CampaignLaunchPhishSentinel: 'This will save the campaign at PhishSentinel',

  CreatedTraining: 'Assignment successfully launch',
  AssignmentDelete: 'Assignment successfully deleted',
  assignmentNotfound: 'Assignment not found',
  AssignmentLaunch: 'Assignment successfully launched',

  //Email template
  EmailTemplateCreated: 'Email template successfully created',
  EmailTemplateUpdated: 'Email template successfully updated',
  EmailTemplateDeleted: 'Email template successfully deleted',
  EmailTemplateNotFound: 'Email template not found',

  //Category 
  CategoryCreated: 'Category successfully created',
  CategoryUpdated: 'Category successfully updated',
  CategoryDeleted: 'Category successfully deleted',
  CategoryNotFound: 'Category not found',
  InvalidCategoryId: 'Category Id invalid',

  //Industry
  IndustryCreated: 'Industry successfully created',
  IndustryUpdated: 'Industry successfully updated',
  IndustryDeleted: 'Industry successfully deleted',
  IndustryNotFound: 'Industry is not found',

  //Track event
  TrackEventCreated: 'Track event successfully created',
  TrackEventUpdated: 'Track event successfully updated',
  TrackEventDeleted: 'Track event successfully deleted',
  TrackEventNotFound: 'Track event not found',

  //Smtp profile
  SendingProfileCreated: 'Sending profile successfully created',
  SendingProfileUpdated: 'Sending profile successfully updated',
  SendingProfileDeleted: 'Sending profile successfully deleted',
  SendingProfileNotFound: 'Sending profile not found',

  //Tag
  TagCreated: 'Tag successfully created',
  TagUpdated: 'Tag successfully updated',
  TagDeleted: 'Tag successfully deleted',
  TagNotFound: 'Tag not found',
  AddUserTag: 'Add users tag successfully',
  InvalidTagId: 'Tag Id invalid',

  //Department
  DepartmentCreated: 'Department successfully created',
  DepartmentUpdated: 'Department successfully updated',
  DepartmentDeleted: 'Department successfully deleted',
  DepartmentNotFound: 'Department not found',
  AddUserDepartment: 'Add users department successfully',

  //Group
  GroupCreated: 'Group successfully created',
  GroupUpdated: 'Group successfully updated',
  GroupDeleted: 'Group successfully deleted',
  GroupNotFound: 'Group not found',
  AddUserGroup: 'User has been added successfully',
  UserIdRequired: 'User id is required in params',
  UserRemoveGroup: 'User remove group successfully',

  //Company tag
  CompanyTagCreated: 'Company tag successfully created',
  CompanyTagUpdated: 'Company tag successfully updated',
  CompanyTagDeleted: 'Company tag successfully deleted',
  CompanyTagNotFound: 'Company tag not found',

  //Landing page
  LandingPageCreated: 'Landing page successfully created',
  LandingPageUpdated: 'Landing page successfully updated',
  LandingPageDeleted: 'Landing page successfully deleted',
  LandingPageNotFound: 'Landing page not found',

  //Files
  CSVEmployeesCreate: 'CSV uploaded successfully employees',
  PleaseInsertOneRow: 'Please insert one row in csv file',
  NoFile: 'No such file or directory',
  SelectFile: 'Please select a file!',
  InvalidImageId: 'Invalid image id',
  SelectValid: 'Select a valid file',
  ValidURL: 'Enter a valid URL',
  SelectValidFileOrURL: 'Please select a valid file or url',

  //User agent 
  useragentCreated: 'User agent successfully created',
  useragentUpdated: 'User agent successfully updated',
  useragentDeleted: 'User agent successfully deleted',
  useragentNotFound: 'User agent not found',

  //IP 
  IPCreated: 'IP successfully created',
  IPUpdated: 'IP successfully updated',
  IPDeleted: 'IP successfully deleted',
  IPNotFound: 'IP not found',

  //Domain
  DomainCreated: 'Domain successfully created',
  DomainUpdated: 'Domain successfully updated',
  DomainDeleted: 'Domain successfully deleted',
  DomainNotFound: 'Domain not found',

  //Notification
  NotificationCreated: 'Notification successfully created',
  NotificationUpdated: 'Notification successfully updated',
  NotificationDeleted: 'Notification successfully deleted',
  NotificationNotFound: 'Notification not found',

  //Question
  QuestionCreated: 'Question successfully created',
  QuestionUpdated: 'Question successfully updated',
  QuestionDeleted: 'Question successfully deleted',
  QuestionNotFound: 'Question not found',
  CourseResult: 'Submit successfully',

  //Training 
  CreateTraining: 'Training successfully created',
  TrainingUpdate: 'Training successfully updated',

  YouDoNotAccess: 'You have do not access',
  TestEmailSend: 'Test email send successfully',
  TestEmailSendFaild: 'Test email faild. Please enter right information',

  //News and tip
  NewsCreated: 'News successfully created',
  TipCreated: 'Tip successfully created',
  ItmeNotFound: 'Item is not found',
  NewsAndTipUpdate: 'News and tip is successfully updated',
  DeleteItem: 'Item is successfully deleted',

  AddMember: 'Member add successfully',
  DeleteMember: 'Member successfully deleted',
  MemberNotFound: 'Member is not found',

  DarkWebCreated: 'Breach added successfully',
  DarkWebDeleted: 'Dark web is successfully deleted',
  DarkWebNotFound: 'Dark web is not found',

  CoursePass: 'Congratulations, You have passed this quiz',
  CourseFailed: 'Sorry, Better luck next time',

  UpdateBreachData: 'Breach successfully updated',
  NotFoundBreachData: 'Breach not found',
  DeleteBreach: 'Breach successfully deleted'
}