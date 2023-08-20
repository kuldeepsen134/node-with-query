const { EmailLog, TrackEvent, Campaign, EmailTemplate, CampaignAudience, User, sequelize, LandingPage, Domain, SendingProfile, Assignment, EmailTemplateTraining, AssignmentAudience, Course, AssignmentCourse, AssignmentsEvent, AssignmentEmailLog, CampaignGophish } = require('app/models')

const { bulkEmail, sendEmail } = require('../../../send-email');
const { prefixTableName, handleError, handleResponse, getDay, axiosGophishClient, getUseragentName, getOperatingSystem, getGeoLocation } = require('../../../utils');
const { Op } = require('sequelize');

exports.cronJobEmailSend = async (req, res) => {
  // try {
  if (req?.query?.security_key === '05f22c2e-7aab-45db-b3fe-1c4565eb2030') {
    const emails = await EmailLog.findAll({ where: { status: 'pending' }, raw: true, limit: 12 });

    function updateLinksInHTML(html, secret_key) {
      var regex = /href\s*=\s*(['"])(https?:\/\/.+?)\1/gi;

      // Use replaceAll to replace all occurrences
      let updatedHtml = html.replaceAll(regex, (match, p1, p2) => {
        const updatedURL = `${process.env.TRACK_LINK_URL}?secret_key=${secret_key}&redirect_to=${encodeURIComponent(p2)}`;
        return `href=${p1}${updatedURL}${p1}`;
      });

      return updatedHtml;
    }

    let count = 0;

    for (let index = 0; index < emails.length; index++) {
      const element = emails[index];
      // const user = await User.findOne({ where: { id: element.user_id }, raw: true });
      // const campaign = await Campaign.findOne({ where: { id: element.campaign_id }, raw: true });

      // if (campaign) {
      // const domainUrl = await Domain.findOne({ where: { id: campaign.domain_id }, raw: true });
      // const emailContent = await EmailTemplate.findOne({ where: { id: campaign.email_template_id }, raw: true })
      // const smtpProfile = await SendingProfile.findOne({ where: { id: campaign.sending_profile_id }, raw: true })

      const smtpProfile = await sequelize.query(`
          SELECT * 
          FROM
          ${prefixTableName('sending_profiles')}
          WHERE id in (SELECT sending_profile_id FROM ${prefixTableName('campaigns')} WHERE id = '${element.campaign_id}') 
        `, { plain: true, raw: true })

      const emailHeaders = JSON.parse(element?.email_template)?.header
      let headers = {};

      if (emailHeaders) {
        emailHeaders.forEach(header => {
          const key = header.name;
          const value = header.value;
          headers[key] = value;
        });
      }
      const senderData = JSON.parse(element?.email_template)
      const placeholders = JSON.parse(element.placeholders)

      let emailTemplate = element?.email_content?.replaceAll('{{.FirstName}}', placeholders?.first_name);
      emailTemplate = emailTemplate.replaceAll('{{.LastName}}', placeholders?.last_name);
      // emailTemplate = emailTemplate?.replace('{{email}}', element?.user_email);
      // emailTemplate = emailTemplate?.replace('{{campaign_title}}', campaign?.campaign_name);
      emailTemplate = emailTemplate.replace('</body>', emailTemplate.includes('</body>')
        ? `<img src="${process.env.BASE_URL}v1/admin/track-events/open?secret_key=${element.secret_key}"></body>`
        : `<img src="${process.env.BASE_URL}v1/admin/track-events/open?secret_key=${element.secret_key}">`
      );
      emailTemplate = updateLinksInHTML(emailTemplate, element.secret_key);
      emailTemplate = emailTemplate.replaceAll('{{.URL}}', `${placeholders.url}${element.secret_key}`);

      const data = await bulkEmail({
        from: `${senderData?.from_name || '_'}<${senderData.from_email}>`,
        email: `${placeholders?.first_name + ' ' + placeholders?.last_name} <${element.user_email}>`,
        reply: senderData.from_email,
        // secure: JSON.parse(element?.email_headers)?.high_importance || false,
        host: smtpProfile.host,
        port: smtpProfile.port,
        encryption: smtpProfile.encryption,
        user: `${smtpProfile.user_name}`,
        pass: `${smtpProfile.password}`,
        subject: senderData.subject,
        email_content: emailTemplate,
        // headers: headers
      });

      if (data?.accepted) {
        await EmailLog.update({ status: 'sent' }, { where: { id: element.id } });

        await TrackEvent.create({ entity_id: element.id, event: 'sent', useragent: 'other', os: 'other', secret_key: element.secret_key })
        count++;
      } else {
        await EmailLog.update({ status: 'send_failed', note: JSON.stringify(data) }, { where: { id: element.id } });

        await TrackEvent.create({ entity_id: element.id, note: JSON.stringify(data), event: 'send_failed', useragent: 'other', os: 'other', secret_key: element.secret_key })
      }
      // }
    }

    handleResponse(res, { data: { message: `User count is ${count}` } });
  } else {
    handleError('Please enter a valid key', req, res);
  }
  // } catch (error) {
  //   handleError(error, req, res);
  // }
};


exports.cronJobShootCampaign = async (req, res) => {
  return true
  try {
    if (req?.query?.security_key === '628a35c7-3b1e-4727-8fbb-ff2396984fec') {

      const campaigns = await Campaign.findAll({
        where: {
          status: {
            [Op.in]: ['active', 'running']
          },
          start_date: {
            [Op.lte]: new Date()
          },
          end_date: {
            [Op.gte]: new Date()
          },
          days: {
            [Op.like]: `%${getDay()}%`
          },
          // start_time: {
          //   [Op.lte]: getTime()
          // },
          // end_time: {
          //   [Op.gte]: getTime()
          // }
        },
        raw: true,
      })

      await Campaign.update({ status: 'completed' }, {
        where: {
          end_date: { [Op.lt]: new Date() }
        }
      })

      let count = 0;

      for (let index = 0; index < campaigns.length; index++) {
        const element = campaigns[index];

        if (element.status === 'active' || element.status === 'running') {
          const campaign = await Campaign.findByPk(element.id)

          if (campaign) {
            // Find the email template by its ID
            const emailTemplate = await EmailTemplate.findByPk(campaign.email_template_id)

            // Retrieve the audience data for the campaign
            const audienceData = await CampaignAudience.findAll({ where: { campaign_id: element.id }, raw: true })

            if (audienceData[0]?.audience_type === 'all') {

              // Process for audience type 'all'
              const exclude_list = audienceData[0].exclude_list ? audienceData[0].exclude_list.split(',').map(value => value.trim()) : []
              const emailContent = emailTemplate?.html_content?.replace(/'/g, "''");

              const users = await User.findAll({
                attributes: [
                  ['id', 'user_id'],
                  ['email', 'user_email'],
                  [sequelize.literal("first_name || ' ' || last_name"), 'full_name'],
                  [sequelize.literal(`'${element.id}'`), 'campaign_id'],
                  [sequelize.literal(`E'${emailContent}'`), 'email_content']
                ],
                where: sequelize.and(
                  { id: { [Op.notIn]: exclude_list } },
                  { status: 'active' },
                  { company_id: campaign.company_id },
                  sequelize.literal(`
                email NOT IN (
                  SELECT a.user_email 
                  FROM "${prefixTableName('email_logs')}" AS a
                  WHERE a."campaign_id" = '${element.id}'
                )
              `)
                ),
                raw: true
              });

              if (element.status === 'active') {
                await Campaign.update({ status: 'running' }, { where: { id: element.id } })
              }
              // Bulk create email logs for the users
              const data = await EmailLog.bulkCreate(users)

              count += data?.length || 0

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
                '${element.id}' as campaign_id
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
                  FROM "${prefixTableName('email_logs')}"
                  WHERE "campaign_id" = '${element.id}'
                )
                AND 
                b.status = 'active'
              GROUP BY
                a.user_id,
                b.email,
                b.first_name,
                b.last_name
            `);

              if (element.status === 'active') {
                await Campaign.update({ status: 'running' }, { where: { id: element.id } })
              }

              // Bulk create email logs for the users
              const data = await EmailLog.bulkCreate(users)

              count += data?.length || 0
            }
          }
        }
      }

      handleResponse(res, { data: { message: `User count is ${count}` } })
    } else {
      handleError('Please enter a valid key', req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.cronJobShootAssignment = async (req, res) => {
  try {
    if (req?.query?.security_key === '5ff2e83f-3f08-4366-b91b-1d639f413ea3') {

      const trainings = await Assignment.findAll({
        where: {
          status: {
            [Op.in]: ['active', 'running']
          },
          start_date: {
            [Op.lte]: new Date()
          }
          // start_time: {
          //   [Op.lte]: getTime()
          // },
          // end_time: {
          //   [Op.gte]: getTime()
          // }
        },
        raw: true,
      })

      let count = 0;

      for (let index = 0; index < trainings.length; index++) {
        const element = trainings[index];
        if (element.status === 'active' || element.status === 'running') {

          // Find the email template by its ID
          const emailTemplate = await EmailTemplateTraining.findOne({
            where: {
              training_assign_id: element.id, days: {
                [Op.like]: `%${getDay()}%`
              }, type: 'enrollment'
            }
          })

          // Retrieve the audience data for the campaign
          const audienceData = await AssignmentAudience.findAll({ where: { assignment_id: element.id }, raw: true })

          if (audienceData[0]?.audience_type === 'all') {

            // Process for audience type 'all'
            const exclude_list = audienceData[0].exclude_list ? audienceData[0].exclude_list.split(',').map(value => value.trim()) : []
            const emailContent = emailTemplate?.html_content?.replace(/'/g, "''");

            const users = await User.findAll({
              attributes: [
                ['id', 'user_id'],
                ['email', 'user_email'],
                [sequelize.literal("first_name || ' ' || last_name"), 'full_name'],
                [sequelize.literal(`'${element.id}'`), 'assignment_id'],
                [sequelize.literal(`E'${emailContent}'`), 'email_content']
              ],
              where: sequelize.and(
                { id: { [Op.notIn]: exclude_list } },
                { status: 'active' },
                { company_id: element.company_id },
                sequelize.literal(`
                email NOT IN (
                  SELECT a.user_email 
                  FROM "${prefixTableName('assignment_email_logs')}" AS a
                  WHERE a."assignment_id" = '${element.id}'
                )
              `)
              ),
              raw: true
            });

            if (element.status === 'active') {
              await Assignment.update({ status: 'running' }, { where: { id: element.id } })
            }
            // Bulk create email logs for the users
            const data = await AssignmentEmailLog.bulkCreate(users)

            count += data?.length || 0

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
                '${element.id}' as assignment_id
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
                  WHERE "assignment_id" = '${element.id}'
                )
                AND 
                b.status = 'active'
              GROUP BY
                a.user_id,
                b.email,
                b.first_name,
                b.last_name
            `);

            if (element.status === 'active') {
              await Assignment.update({ status: 'running' }, { where: { id: element.id } })
            }

            // Bulk create email logs for the users
            const data = await AssignmentEmailLog.bulkCreate(users)

            count += data?.length || 0
          }
        }
      }

      handleResponse(res, { data: { message: `User count is ${count}` } })
    } else {
      handleError('Please enter a valid key', req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.cronJobEmailSentEmailTrainings = async (req, res) => {
  try {
    const emailLogs = await AssignmentEmailLog.findAll({ where: { status: 'pending' }, raw: true, limit: 12 })
    let count = 0;

    for (let i = 0; i < emailLogs.length; i++) {
      const element = emailLogs[i];

      // const assignment = await Assignment.findOne({ where: { id: element.assignment_id }, raw: true })

      // const courses = await AssignmentCourse.findAll({ where: { assignment_id: assignment.id }, raw: true })

      // const courseIds = courses.map((item) => { return item.course_id })

      // const coursesData = await Course.findAll({ where: { id: courseIds }, raw: true })

      // let htmlContent = []

      // for (let j = 0; j < coursesData.length; j++) {
      //   const course = coursesData[j];

      //   htmlContent.push(`<p><strong>Course Name:</strong>${course.title}</p>
      //   <p><strong>Duration:</strong>${course.duration}</p>
      //   <strong>${course.passing_score}</strong>`)
      // }

      // const emailTemplate = await EmailTemplateTraining.findOne({ where: { training_assign_id: element.assignment_id, type: 'enrollment' }, raw: true })

      // const finalEmailContent = emailTemplate.html_content.replace('{{HTML_CONTENT}}', htmlContent[0])
      const senderData = JSON.parse(element?.email_template)
      const placeholders = JSON.parse(element.placeholders)

      const smtpProfile = await sequelize.query(`
          SELECT * 
          FROM
          ${prefixTableName('sending_profiles')}
          WHERE id in (SELECT sending_profile_id FROM ${prefixTableName('training_assignments')} WHERE id = '${element.assignment_id}') 
        `, { plain: true, raw: true })

      const data = await bulkEmail({
        from: `${senderData?.from_name || '_'}<${senderData?.from_email || '_'}>`,
        email: `${placeholders?.first_name || '_' + ' ' + placeholders?.last_name || '_'} <${element?.user_email}>`,
        subject: senderData.subject,
        reply: smtpProfile.user_name,
        email_content: element.email_content,
        host: smtpProfile.host,
        port: smtpProfile.port,
        user: smtpProfile.user_name,
        pass: smtpProfile.password,
      });

      if (data?.accepted) {
        await AssignmentEmailLog.update({ status: 'sent' }, { where: { id: element.id } });

        await AssignmentsEvent.create({ assignment_id: element.assignment_id, user_id: element.user_id, entity_id: element.id, event: 'sent', useragent: 'other', os: 'other', secret_key: element.secret_key })
        count++;
      } else {
        await AssignmentEmailLog.update({ status: 'send_failed', note: data }, { where: { id: element.id } });

        await AssignmentsEvent.create({ assignment_id: element.assignment_id, user_id: element.user_id, entity_id: element.id, event: 'send_failed', useragent: 'other', os: 'other', secret_key: element.secret_key })
      }
    }

    handleResponse(res, { data: { message: `Emails sent for training assignments ${count}` } });
  } catch (error) {
    handleError(error, req, res);
  }
}

exports.getGophishEvents = async (req, res) => {

  const result = await sequelize.query(`
    SELECT *
    FROM 
      ${prefixTableName('campaign_gophishes')} AS a,
      ${prefixTableName('email_logs')} AS b
    WHERE a.entity_id = '${req.body.campaign_id}'
      AND a.entity_type = 'campaign'
      AND b.user_email = '${req.body.email}'
      AND b.campaign_id = a.campaign_id;
    `, { plain: true, raw: true }
  )

  const event = (() => {
    switch (req.body.message) {
      case 'Email/SMS Sent':
        return 'sent';
      case 'Email/SMS Opened':
        return 'open';
      case 'Submitted Data':
        return 'captured';
      default:
        return null;
    }
  })();

  if (result) {
    const payload = {}

    if (req.body.details) {
      const details = JSON.parse(req.body.details)

      const location = await getGeoLocation(details.browser['orig-address'])

      payload.useragent_raw = details.browser['user-agent'] ? details.browser['user-agent'] : '',
      payload.useragent = details.browser['user-agent'] ? getUseragentName(details.browser['user-agent']) : '',
      payload.os = getOperatingSystem(details.browser['user-agent']),
      payload.ip = details.browser['orig-address'] ? details.browser['orig-address'] : '',
      payload.city = location?.data?.city || '',
      payload.location = JSON.stringify(location?.data || ''),
      payload.state = location?.data?.state_prov || '',
      payload.country = location?.data?.country_name || ''
    }

    payload.entity_id = result.id,
    payload.event = event,
    payload.request_header = JSON.stringify(req.headers)

    await TrackEvent.create(payload)
  }

  await sendEmail({ email: 'mahesh@piecodes.in', subject: `Testing`, otp: JSON.stringify(req.body), fileName: 'data', res: res })
  handleResponse(res, { message: 'Created event successfully' })
}