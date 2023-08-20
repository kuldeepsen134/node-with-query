// Import 'Op' object provides operators for Sequelize queries
const { Op } = require('sequelize')

//Import models database
const {
  Campaign,
  User,
  Company,
  EmailTemplate,
  sequelize,
  CampaignAudience,
  EmailLog,
  TrackEvent,
  TagRelationship,
  SendingProfile,
  Domain,
  LandingPage,
  CampaignGophish
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
  axiosGophishClient,
  getCurrentDateAndTime,
  createCampaignEmailLog,
  convertMilitaryTimeToTimeZone,
} = require('app/utils')

//Import handleSearchAndFilters function
const { handleSearchAndFilters } = require('../helper')

//Import validation schemas
const { createCampaignSchema, updateCampaignSchema } = require('./validator')

/**
 * Export an asynchronous function named `create`
 * Create campaign
 * @param req - The request object.
 * @param res - The response object.
 */
exports.create = async (req, res) => {
  try {
    req.body.domain_id = req.body.type === 'advance' ? null : req.body.domain_id
    // Validate the request body using the createCampaignSchema
    const { error } = createCampaignSchema.validate(req.body);

    // If there is a validation error, handle it and return
    if (error) {
      throw error;
    }

    // Destructure the required fields from the request body
    const {
      title,
      type,
      language,
      status,
      start_date,
      end_date,
      start_time,
      end_time,
      days,
      description,
      email_template_id,
      sending_profile_id,
      landing_page_id,
      time_zone,
      domain_id,
      success_event_type,
      gophish_id,
      gophish_api_url,
      gophish_api_key,
      evilginx_url
    } = req.body;

    // Prepare the data to be inserted into the database
    const data = {
      title,
      type,
      language,
      status,
      start_date,
      end_date,
      start_time: convertMilitaryTimeToTimeZone(start_time, time_zone),
      end_time: convertMilitaryTimeToTimeZone(end_time, time_zone),
      days,
      description,
      created_by: req.headers.role === 'super_administrator' ? req.body.user_id : req.headers.user_id,
      company_id: req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id,
      email_template_id,
      sending_profile_id,
      landing_page_id,
      domain_id,
      time_zone,
      success_event_type,
      gophish_id,
      gophish_api_url,
      gophish_api_key,
      evilginx_url
    };

    const campaign = await sequelize.transaction(async (t) => {
      const createdCampaign = await Campaign.create(data, { transaction: t });

      const audienceData = req.body.audience.map((item) => ({
        campaign_id: createdCampaign.id,
        exclude_list: item.exclude_list.length > 0 ? item.exclude_list.join(', ') : null,
        audience_type: item.audience_type,
        audience_group_id: item.audience_group_id ? item.audience_group_id : null
      }));

      await CampaignAudience.bulkCreate(audienceData, { transaction: t });

      const tags = req.body.tag_ids?.map((item) => ({
        tag_id: item,
        entity_id: createdCampaign.id
      }));

      if (tags) {
        await TagRelationship.bulkCreate(tags, { transaction: t });
      }

      return createdCampaign;
    }).catch((error) => {
      handleError(error, req, res)
    })

    if (status === 'active' || type === 'advance') {
      await createCampaignEmailLog(campaign.id, req, res)
    }

    handleResponse(res, { data: campaign, message: status === 'draft' && type === 'phishing' ? strings.CampaignDraft : type === 'advance' ? strings.CampaignLaunchPhishSentinel : strings.CampaignLaunch });

    // Handle the successful response with the created campaign data
  } catch (error) {
    // Handle any errors that occurred during the execution
    handleError(error, req, res);
  }
};

/**
 * Export an asynchronous function named `findAll`
 * Get all Campaign with filters, search, sorting and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = (req, res) => {
  try {
    // Extract the page and per_page query parameters from the request
    const { page, per_page } = req.query;

    // Get the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page);

    // Get the sorting parameters for the query
    const sortResponse = sortingData(req);

    // Find and count all campaigns with applied filters, sorting, limit, and offset
    Campaign.findAndCountAll({
      where: handleSearchAndFilters(req, ['title']), // Apply search and filter conditions
      order: [[sortResponse.sortKey, sortResponse.sortValue]], // Apply sorting
      limit,
      offset,
    }).then(async (data) => {
      // Prepare the response data with pagination information
      handleResponse(res, { data: getPagingResults(data, page, limit) });
    }).catch(error => {
      // Handle any error that occurred during the retrieval process
      handleError(error, req, res);
    });
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res);
  }
}

/**
 * Export an asynchronous function named `findOne`
 * Get by campaign ID
 * @param req - The request object.
 * @param res - The response object.
 */
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

    // Find a campaign by its primary key (id)
    Campaign.findOne({
      where: { id: req.params.id, ...where },
      include: [{
        model: User,
        attributes: { exclude: ['otp'] } // Exclude the 'otp' attribute from the User model
      },
      {
        model: Company
      },
      {
        model: EmailTemplate
      },
      {
        model: SendingProfile
      },
      {
        model: LandingPage
      },
      {
        model: Domain
      }
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT array_agg(
                json_build_object(
                  'campaign_id', a."campaign_id",
                  'exclude_list', a."exclude_list",
                  'audience_type', a."audience_type",
                  'audience_group_id', a."audience_group_id"
                )
              )
              FROM "${prefixTableName('campaign_audience')}" AS a
              WHERE a.campaign_id = '${req.params.id}'
            )`), 'audience'
          ],
          [sequelize.literal(`(
            SELECT array_agg( 
              json_build_object(
              'tag_id', b."tag_id",
              'title', c."title"
            ))
          FROM "${prefixTableName('campaigns')}" AS a 
          JOIN "${prefixTableName('tags_relationships')}" AS b ON a.id = b.entity_id 
          LEFT JOIN "${prefixTableName('tags')}" AS c ON c.id = b.tag_id
          WHERE b.entity_id = '${req.params.id}'
          )`), 'tag_ids'], // Get cmapaign tags by entity ID and tag ID
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM "${prefixTableName('email_logs')}" AS a
              JOIN "${prefixTableName('campaigns')}" AS b ON b.id = a.campaign_id
              WHERE b.id = '${req.params.id}'
              GROUP BY b.id
            )`),
            'total_target'
          ]
        ]
      }

    }).then(async (data) => {
      // Prepare the response with the campaign data or an empty object if data is not found
      handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} });
    }).catch(error => {
      // Handle any error that occurred during the retrieval process
      handleError(error, req, res);
    });
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res);
  }
}

/**
 * Export an asynchronous function named `update`
 * Update campaign by id
 * @param req - The request object.
 * @param res - The response object.
 */
exports.update = async (req, res) => {
  try {
    // Validate the request body using updateCampaignSchema
    const { error } = updateCampaignSchema.validate(req.body);

    // If there is a validation error, handle it and return
    if (error) {
      handleError(error, req, res);
      return;
    }

    let where;
    if (req.headers.role !== 'super_administrator') {
      where = { company_id: req.headers.company_id };
    }

    // Destructure the required fields from the request body
    const {
      title,
      type,
      language,
      status,
      start_date,
      end_date,
      start_time,
      end_time,
      days,
      description,
      email_template_id,
      sending_profile_id,
      landing_page_id,
      time_zone,
      tag_id,
      gophish_id,
      gophish_api_url,
      gophish_api_key,
      evilginx_url
    } = req.body;

    // Prepare the data to be inserted into the database
    const data = {
      title,
      type,
      language,
      status,
      start_date,
      end_date,
      start_time: convertMilitaryTimeToTimeZone(start_time, time_zone),
      end_time: convertMilitaryTimeToTimeZone(end_time, time_zone),
      days,
      description,
      created_by: req.headers.role === 'super_administrator' ? req.body.user_id : req.headers.user_id,
      company_id: req.headers.role === 'super_administrator' ? req.body.company_id : req.headers.company_id,
      email_template_id,
      sending_profile_id,
      landing_page_id,
      time_zone,
      tag_id,
      gophish_id,
      gophish_api_url,
      gophish_api_key,
      evilginx_url
    };

    const campaign = await sequelize.transaction(async (t) => {
      // Update campaign by Id
      await Campaign.update(data, { where: { id: req.params.id, ...where }, transaction: t });

      // Prepare the audience data to be inserted into the CampaignAudience table
      const audience = req.body.audience?.map((item) => {
        return {
          campaign_id: req.params.id,
          exclude_list: item.exclude_list?.length > 0 ? item.exclude_list.join(', ') : null,
          audience_type: item.audience_type,
          audience_group_id: item.audience_group_id ? item.audience_group_id : null,
        };
      });

      // Bulk create the audience records in the CampaignAudience table
      if (audience && audience.length > 0) {
        await CampaignAudience.destroy({ where: { campaign_id: req.params.id }, transaction: t });
        await CampaignAudience.bulkCreate(audience, { transaction: t });
      }


      const tags = req.body.tag_ids?.map((item) => ({
        tag_id: item,
        entity_id: req.params.id,
      }));

      if (tags && tags.length > 0) {
        await TagRelationship.destroy({ where: { entity_id: req.params.id }, transaction: t });
        // Bulk create the tag records in the Tag relationship table
        await TagRelationship.bulkCreate(tags, { transaction: t });
      }

      // Check if the update was successful
      if (type === 'phishing') {
        handleResponse(res, { message: strings.CampaignUpdated })
      }else{
        handleResponse(res, '')
      }
    });
  } catch (error) {
    handleError(error, req, res);
  }
};

exports.campaignModify = async (req, res) => {
  try {
    if (req?.body?.action === 'start') {
      await Campaign.update({ status: 'active' }, { where: { id: req.params.id } })

      handleResponse(res, { message: strings.CampaignStart });
    } else if (req?.body?.action === 'stop') {
      await Campaign.update({ status: 'stopped' }, { where: { id: req.params.id } })

      handleResponse(res, { message: strings.CampaignStop });
    } else if (req?.body?.action === 'resume') {
      await Campaign.update({ status: 'active' }, { where: { id: req.params.id } })

      handleResponse(res, { message: strings.CampaignResume });
    } else if (req?.body?.action === 'restart') {
      await sequelize.query(`
        DELETE
        FROM ${prefixTableName('campaign_events')}
        WHERE entity_id in (SELECT id FROM ${prefixTableName('email_logs')} WHERE campaign_id = '${req.params.id}')
      `)

      await EmailLog.update({ status: 'pending' }, { where: { campaign_id: req.params.id } })

      await Campaign.update({ status: 'active' }, { where: { id: req.params.id } })

      handleResponse(res, { message: strings.CampaignRestart });
    } else if (req.query.action === 'reset') {
      await sequelize.query(`
        DELETE 
        FROM ${prefixTableName('campaign_events')}
        WHERE entity_id in (SELECT id FROM ${prefixTableName('email_logs')} WHERE campaign_id = '${req.params.id}')
      `)

      handleResponse(res, { message: strings.CampaignReset });
    }
  } catch (error) {
    // Handles any errors that occur in the try block
    handleError(error, req, res);
  }
}

exports.campaignDelete = async (req, res) => {
  try {

    await sequelize.query(`
    DELETE
    FROM ${prefixTableName('campaign_events')}
    WHERE entity_id in (SELECT id FROM ${prefixTableName('email_logs')} WHERE campaign_id = '${req.params.id}')
  `)

    await EmailLog.destroy({ where: { campaign_id: req.params.id } })

    await CampaignAudience.destroy({ where: { campaign_id: req.params.id } })

    const data = await Campaign.destroy({ where: { id: req.params.id } })

    handleResponse(res, { message: data === 1 ? strings.CampaignDeleted : strings.CampaignNotFound })
  } catch (error) {
    handleError(error, req, res)
  }

}

/**
 * Export an asynchronous function named `getEmailLog`
 * Get all email logs with filters and search
 * @param req - The request object.
 * @param res - The response object.
 */
exports.getEmailLog = async (req, res) => {
  try {
    const { page, per_page } = req.query; // Extracts 'page' and 'per_page' from the query parameters
    const { limit, offset } = getPagination(page, per_page); // Calculates the 'limit' and 'offset' values for pagination
    const sortResponse = sortingData(req); // Retrieves the sort key and sort value for sorting the data

    const campaign = await Campaign.findOne({ where: { id: req.params.id }, raw: true })

    if (req.headers.role === 'super_administrator' || campaign?.company_id === req?.headers?.company_id) {
      EmailLog.findAndCountAll(
        {
          where: handleSearchAndFilters(req, ['user_email']), // Applies search and filter conditions to the query
          order: [[sortResponse.sortKey, sortResponse.sortValue]], // Sets the sort order based on the sort key and sort value
          limit, offset // Sets the limit and offset for pagination
        }
      )
        .then(async (data) => {
          handleResponse(res, { data: getPagingResults(data, page, limit) }); // Sends the paginated data as a response
        }).catch(error => {
          handleError(error, req, res); // Handles any errors that occur during the query
        });
    } else {
      handleError(strings.YouDoNotAccess, req, res)
    }
  } catch (error) {
    handleError(error, req, res); // Handles any errors that occur in the try block
  }
};

/**
 * Export an asynchronous function named `getCampaignEventsSummary`
 * Get all campaign events summary with filters and search
 * @param req - The request object.
 * @param res - The response object.
 */
exports.getCampaignEventsSummary = async (req, res) => {

  try {
    req.query.filters = { campaign_id: req.params.id }
    const { page, per_page } = req.query; // Extracts 'page' and 'per_page' from the query parameters
    const { limit, offset } = getPagination(page, per_page); // Calculates the 'limit' and 'offset' values for pagination
    const sortResponse = sortingData(req); // Retrieves the sort key and sort value for sorting the data

    const campaign = await Campaign.findOne({ where: { id: req.params.id }, raw: true })

    if (req.headers.role === 'super_administrator' || campaign.company_id === req.headers.company_id) {
      EmailLog.findAndCountAll({
        where: handleSearchAndFilters(req, ['user_email']), // Applies search and filter conditions to the query
        order: [[sortResponse.sortKey, sortResponse.sortValue]], // Sets the sort order based on the sort key and sort value
        limit,
        offset, // Sets the limit and offset for pagination
        raw: true,
        attributes: {
          include: [
            [sequelize.literal(`(
              SELECT count(*) AS "count"
              FROM "${prefixTableName('campaign_events')}" AS "campaign_events"
              WHERE "campaign_events"."entity_id" = "email_logs"."id"
                AND "campaign_events"."event" = 'sent'
            )`), 'sent'
            ],
            [sequelize.literal(`(
              SELECT count(*) AS "count"
              FROM "${prefixTableName('campaign_events')}" AS "campaign_events"
              WHERE "campaign_events"."entity_id" = "email_logs"."id"
                AND "campaign_events"."event" = 'open'
            )`), 'open'
            ],
            [sequelize.literal(`(
              SELECT count(*) AS "count"
              FROM "${prefixTableName('campaign_events')}" AS "campaign_events"
              WHERE "campaign_events"."entity_id" = "email_logs"."id"
                AND "campaign_events"."event" = 'click'
            )`), 'click'
            ],
            [sequelize.literal(`(
              SELECT count(*) AS "count"
              FROM "${prefixTableName('campaign_events')}" AS "campaign_events"
              WHERE "campaign_events"."entity_id" = "email_logs"."id"
                AND "campaign_events"."event" = 'success'
            )`), 'success'
            ],
            [sequelize.literal(`(
              SELECT count(*) AS "count"
              FROM "${prefixTableName('campaign_events')}" AS "campaign_events"
              WHERE "campaign_events"."entity_id" = "email_logs"."id"
                AND "campaign_events"."event" = 'captured'
            )`), 'captured'
            ],
            [sequelize.literal(`(
              SELECT count(*) AS "count"
              FROM "${prefixTableName('campaign_events')}" AS "campaign_events"
              WHERE "campaign_events"."entity_id" = "email_logs"."id"
                AND "campaign_events"."event" = 'report'
            )`), 'report'
            ]
          ],
          exclude: req.query && req.query?.report == 'true' ? ['id', 'campaign_id', 'user_id', 'note', 'email_content', 'status', 'secret_key', 'placeholders', 'email_template', 'created_at', 'updated_at'] : null,
        }
      }).then(async (data) => {
        handleResponse(res, { data: getPagingResults(data, page, limit) }); // Sends the paginated data as a response
      }).catch(error => {
        handleError(error, req, res); // Handles any errors that occur during the query
      })
    } else {
      handleError(strings.YouDoNotAccess, req, res)
    }
  } catch (error) {
    handleError(error.req, res); // Handles any errors that occur in the try block
  }

}


exports.getCampaignEventsCount = async (req, res) => {

  const total = await EmailLog.count({ // https://sebhastian.com/sequelize-count
    where: { campaign_id: req.params.id }
  });

  var q = ''

  if (req.query && req.query?.unique == 'true') {
    q = `
    SELECT
      a.event,
      COUNT(a.unique_events_count)
    FROM (
      SELECT
        entity_id,
        event,
        COUNT(DISTINCT event) AS unique_events_count
      FROM
        ${prefixTableName('campaign_events')}
      WHERE
        entity_id IN (SELECT id FROM ${prefixTableName('email_logs')} WHERE campaign_id = '${req.params.id}')
      GROUP BY
        entity_id,
        event
    ) AS a
    GROUP BY
      a.event`;
  } else {
    q = `SELECT
      event,
      COUNT(event)
    FROM
      ${prefixTableName('campaign_events')}
    WHERE
      entity_id IN (SELECT id FROM ${prefixTableName('email_logs')} WHERE campaign_id = '${req.params.id}')
    GROUP BY
      event`;
  }

  const data = await sequelize.query(q)

  /*
  const data = await sequelize.query(`
    SELECT COUNT(*),
      a.event
      FROM 
      "${prefixTableName('campaign_events')}" AS a,
      "${prefixTableName('email_logs')}" AS b 
      WHERE
      b.campaign_id = '${req.params.id}'
      AND
      b.id = a.entity_id
      AND 
      b.secret_key = a.secret_key
      GROUP BY a.event, a.entity_id
  `)
  */

  handleResponse(res, {
    data: {
      total: total || 0,
      sent: data[0]?.find((item) => item.event === 'sent')?.count || 0,
      open: data[0]?.find((item) => item.event === 'open')?.count || 0,
      click: data[0]?.find((item) => item.event === 'click')?.count || 0,
      success: data[0]?.find((item) => item.event === 'success')?.count || 0,
      captured: data[0]?.find((item) => item.event === 'captured')?.count || 0,
      report: data[0]?.find((item) => item.event === 'report')?.count || 0
    }
  })
}

exports.botVsReal = async (req, res) => {
  const query1 = `
    SELECT COUNT(*),
      a.bot
    FROM 
      "${prefixTableName('campaign_events')}" AS a
    JOIN 
      "${prefixTableName('email_logs')}" AS b ON b.id = a.entity_id
    WHERE
      b.campaign_id IN (SELECT id FROM "${prefixTableName('campaigns')}")
    AND 
      b.campaign_id = '${req.params.id}'
  GROUP BY
    a.bot;
  `;

  try {
    const overview = await sequelize.query(query1);

    handleResponse(res, {
      data: {
        user_click: parseInt(overview[0][0]?.count) || 0,
        bot_click: parseInt(overview[0][1]?.count) || 0
      }
    });
  } catch (error) {
    handleError(error, req, res);
  }
};

exports.getBrowserStats = async (req, res) => {

  const browserQuery = `
      SELECT COUNT(*),
        a.useragent
      FROM 
        "${prefixTableName('campaign_events')}" AS a
      JOIN 
        "${prefixTableName('email_logs')}" AS b ON b.id = a.entity_id
      WHERE
        b.campaign_id IN (SELECT id FROM "${prefixTableName('campaigns')}"
      )
      AND 
      b.campaign_id = '${req.params.id}'
      GROUP BY
        a.useragent;
    `;

  const browser = await sequelize.query(browserQuery);


  const osQuery = `
    SELECT COUNT(*),
      a.os
    FROM 
      "${prefixTableName('campaign_events')}" AS a
    JOIN 
      "${prefixTableName('email_logs')}" AS b ON b.id = a.entity_id
    WHERE
      b.campaign_id IN (SELECT id FROM "${prefixTableName('campaigns')}"
  )
  AND 
  b.campaign_id = '${req.params.id}'
  GROUP BY
    a.os;
`;

  const operatingSystem = await sequelize.query(osQuery);


  handleResponse(res, { data: { browsers: browser[0], os: operatingSystem[0] } })
}

/**
 * Export an asynchronous function named `findAll`
 * Get all track events with filters, serach, sort and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.getAllEvents = (req, res) => {
  try {
    const { page, per_page } = req.query; // Extracts 'page' and 'per_page' from the query parameters

    // Calculates the 'limit' and 'offset' values for pagination
    const { limit, offset } = getPagination(page, per_page);

    // Retrieves the sort key and sort value for sorting the data
    const sortResponse = sortingData(req);

    // Finds and counts all TrackEvent instances based on search filters, sort order, limit, and offset
    TrackEvent.findAndCountAll({
      where: handleSearchAndFilters(req, ['entity_id']),
      order: [[sortResponse.sortKey, sortResponse.sortValue]], // Sets the sort order based on the sort key and sort value
      limit, offset // Sets the limit and offset for pagination
    })
      .then(data => {
        // Sends the paginated data as a response
        handleResponse(res, { data: getPagingResults(data, page, limit) });
      })
      .catch(error => {
        handleError(error, req, res);
      });
  } catch (error) {
    handleError(error, req, res);// Handle any other error that occurred
  }
}

/**
 * Export an asynchronous function named `findAll`
 * Get all track events with filters, serach, sort and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.getAllEmailLogs = (req, res) => {
  try {
    const { page, per_page } = req.query; // Extracts 'page' and 'per_page' from the query parameters

    // Calculates the 'limit' and 'offset' values for pagination
    const { limit, offset } = getPagination(page, per_page);

    // Retrieves the sort key and sort value for sorting the data
    const sortResponse = sortingData(req);
    var where = ''

    if (req.headers.role != 'super_administrator') {
      where = `AND a.company_id = '${req.headers.company_id}'`
    }

    // Finds and counts all TrackEvent instances based on search filters, sort order, limit, and offset
    EmailLog.findAndCountAll({
      where: {
        [Op.and]: [
          handleSearchAndFilters(req, ['user_email']), // Apply search and filter conditions
          sequelize.literal(`
            EXISTS (
              SELECT 1
              FROM "${prefixTableName('campaigns')}" AS a
              WHERE a.id = "email_logs".campaign_id
              ${where}
            )
          `),
        ],
      },
      order: [[sortResponse.sortKey, sortResponse.sortValue]], // Sets the sort order based on the sort key and sort value
      limit, offset // Sets the limit and offset for pagination
    })
      .then(data => {
        // Sends the paginated data as a response
        handleResponse(res, { data: getPagingResults(data, page, limit) });
      })
      .catch(error => {
        handleError(error, req, res);
      });
  } catch (error) {
    handleError(error, req, res);// Handle any other error that occurred
  }
}

exports.createCampaignEmailLogData = async (req, res) => {
  try {

    const campaign = await Campaign.findOne({ where: { id: req.params.id } })
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
                "${prefixTableName('email_logs')}" AS a
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
          UPDATE ${prefixTableName('email_logs')}
            SET status = 'schedule'
            WHERE campaign_id = '${campaign.id}'
          `)
        }

        handleResponse(res, { message: strings.CampaignLaunch })

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
          UPDATE ${prefixTableName('email_logs')}
            SET status = 'schedule'
            WHERE campaign_id = '${campaign.id}'
          `)
        }

        handleResponse(res, { message: strings.CampaignLaunch })
      }
    }
  } catch (error) {
    handleError(error, req, res)
  }

}

exports.createCampaignGophish = async (req, res) => {
  try {

    const campaign = await Campaign.findOne({ where: { id: req.params.id } })

    if (campaign) {
      const successEvents = await CampaignGophish.findAll({ where: { campaign_id: campaign.id }, raw: true })

      for (let index = 0; index < successEvents.length; index++) {
        const element = successEvents[index];
        if (element.entity_type === 'email_template' && element.status === 'success') {
          await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/templates/${element.entity_id}`, apiKey: campaign.gophish_api_key, method: 'delete' })
        } else if (element.entity_type === 'sending_profile' && element.status === 'success') {
          await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/smtp/${element.entity_id}`, apiKey: campaign.gophish_api_key, method: 'delete' })
        } else if (element.entity_type === 'group' && element.status === 'success') {
          await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/groups/${element.entity_id}`, apiKey: campaign.gophish_api_key, method: 'delete' })
        } else if (element.entity_type === 'campaign' && element.status === 'success') {
          await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/campaigns/${element.entity_id}`, apiKey: campaign.gophish_api_key, method: 'delete' })
        }
      }

      await CampaignGophish.destroy({ where: { campaign_id: campaign.id } })

      const emailTemplate = await EmailTemplate.findByPk(campaign.email_template_id)

      const data = await EmailLog.findAll({ where: { campaign_id: req.params.id } })

      const emailData = {
        name: `${emailTemplate.title}-${Date.now()}`,
        subject: emailTemplate.subject,
        text: 'ddd',
        html: emailTemplate.html_content,
        envelope_sender: emailTemplate.from_email
      }

      const emailTemplateName = await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/templates/`, apiKey: campaign.gophish_api_key, method: 'post', data: emailData })

      if (emailTemplateName?.id) {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_id: emailTemplateName.id, entity_type: 'email_template', status: 'success', note: JSON.stringify(emailTemplateName) })
      } else {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_type: 'email_template', status: 'failed', note: JSON.stringify(emailTemplateName) })
      }

      if (emailTemplateName?.response?.data?.message) {
        handleError(emailTemplateName?.response?.data?.message, req, res)
        return
      }

      const sendingProfileDetail = await SendingProfile.findOne({ where: { id: campaign.sending_profile_id } })

      const sendingProfileData = {
        name: `Phishsentinel - ${Date.now()}`,
        username: sendingProfileDetail.user_name,
        password: sendingProfileDetail.password,
        host: sendingProfileDetail.host,
        interface_type: 'SMTP',
        from_address: emailTemplate.from_email,
        ignore_cert_errors: false
      }

      const sendingProfileName = await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/smtp/`, apiKey: campaign.gophish_api_key, method: 'post', data: sendingProfileData })

      if (sendingProfileName?.id) {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_id: sendingProfileName.id, entity_type: 'sending_profile', status: 'success', note: JSON.stringify(sendingProfileName) })
      } else {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_type: 'sending_profile', status: 'failed', note: JSON.stringify(sendingProfileName) })
      }

      if (sendingProfileName?.response?.data?.message) {
        handleError(sendingProfileName?.response?.data?.message, req, res)
        return
      }

      const usersData = data.map((item) => {
        return ({
          email: item.user_email,
          first_name: '',
          last_name: ''
        })
      })

      const groupName = await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/groups/`, apiKey: campaign.gophish_api_key, method: 'post', data: { name: `${campaign.title} - ${Date.now()}`, targets: usersData } })

      if (groupName?.id) {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_id: groupName.id, entity_type: 'group', status: 'success', note: JSON.stringify(groupName) })
      } else {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_type: 'group', status: 'failed', note: JSON.stringify(groupName) })
      }

      if (groupName?.response?.data?.message) {
        handleError(groupName?.response?.data?.message, req, res)
        return
      }

      const campaignData = {
        name: campaign.id,
        launch_date: getCurrentDateAndTime({ date: campaign.start_date, time: campaign.start_time }),
        template: emailTemplateName,
        smtp: sendingProfileName,
        url: campaign.evilginx_url,
        groups: [
          {
            name: groupName.name
          }
        ]
      }

      const campaignId = await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/campaigns/`, apiKey: campaign.gophish_api_key, method: 'post', data: campaignData })

      if (campaignId?.id) {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_id: campaignId.id, entity_type: 'campaign', status: 'success', note: JSON.stringify(campaignId) })
      } else {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_type: 'campaign', status: 'failed', note: JSON.stringify(campaignId) })
      }

      if (campaignId?.response?.data?.message) {
        handleError(campaignId?.response?.data?.message, req, res)
        return
      }

      await Campaign.update({ gophish_id: campaignId.id }, { where: { id: campaign.id } })

      const events = await CampaignGophish.findAll({ where: { campaign_id: req.params.id }, raw: true })

      handleResponse(res, { data: events, message: strings.CampaignLaunchGophish })
    }
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.testGophishApi = async (req, res) => {
  try {
    const emailTemplate = await axiosGophishClient({ url: `${req.body.gophish_api_url}/api/templates/`, apiKey: req.body.gophish_api_key, method: 'get' })
    if (emailTemplate?.length >= 0) {
      handleResponse(res, { data: emailTemplate })
    } else {
      handleError(emailTemplate, req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.finalCampaignGophishLauch = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ where: { id: req.params.id }, raw: true })
    const data = await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/campaigns/${campaign.gophish_id}`, apiKey: campaign.gophish_api_key, method: 'put', data: { launch_date: getCurrentDateAndTime({ date: campaign.start_date, time: campaign.start_time }) } })
    await Campaign.update({ status: 'active' }, { where: { id: req.params.id } })
    handleResponse(res, { data: data })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.campaignSyncGophish = async (req, res) => {
  const campaigns = await CampaignGophish.findAll({ where: { campaign_id: req.params.id }, raw: true })
  const campaign = await Campaign.findOne({ where: { id: req.params.id }, raw: true })
  await CampaignGophish.destroy({ where: { campaign_id: campaign.id } })
  const emailTemplate = await EmailTemplate.findByPk(campaign.email_template_id)
  const data = await EmailLog.findAll({ where: { campaign_id: req.params.id } })

  let emailTemplateName; let sendingProfileName; let groupName

  for (let index = 0; index < campaigns.length; index++) {
    const element = campaigns[index];

    if (element.entity_type === 'email_template' && element.status === 'failed') {

      const emailData = {
        name: `${emailTemplate.title}-${Date.now()}`,
        subject: emailTemplate.subject,
        text: 'ddd',
        html: emailTemplate.html_content,
        envelope_sender: emailTemplate.from_email
      }

      emailTemplateName = await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/templates/`, apiKey: campaign.gophish_api_key, method: 'post', data: emailData })

      if (emailTemplateName?.id) {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_id: emailTemplateName.id, entity_type: 'email_template', status: 'success', note: JSON.stringify(emailTemplateName) })
      } else {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_type: 'email_template', status: 'failed', note: JSON.stringify(emailTemplateName) })
      }
    } else {
      emailTemplateName = element.note
    }

    if (element.entity_type === 'sending_profile' && element.status === 'failed') {
      const sendingProfileDetail = await SendingProfile.findOne({ where: { id: campaign.sending_profile_id } })

      const sendingProfileData = {
        name: `Phishsentinel - ${Date.now()}`,
        username: sendingProfileDetail.user_name,
        password: sendingProfileDetail.password,
        host: sendingProfileDetail.host,
        interface_type: 'SMTP',
        from_address: emailTemplate.from_email,
        ignore_cert_errors: false
      }

      sendingProfileName = await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/smtp/`, apiKey: campaign.gophish_api_key, method: 'post', data: sendingProfileData })

      if (sendingProfileName?.id) {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_id: sendingProfileName.id, entity_type: 'sending_profile', status: 'success', note: JSON.stringify(sendingProfileName) })
      } else {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_type: 'sending_profile', status: 'failed', note: JSON.stringify(sendingProfileName) })
      }
    } else {
      sendingProfileName = element.note
    }

    if (element.entity_type === 'group' && element.status === 'failed') {
      const usersData = data.map((item) => {
        return ({
          email: item.user_email,
          first_name: '',
          last_name: ''
        })
      })

      groupName = await axiosGophishClient({ url: `${campaign.gophish_api_url}/api/groups/`, apiKey: campaign.gophish_api_key, method: 'post', data: { name: `${campaign.title} - ${Date.now()}`, targets: usersData } })

      if (groupName?.id) {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_id: groupName.id, entity_type: 'group', status: 'success', note: JSON.stringify(groupName) })
      } else {
        await CampaignGophish.create({ campaign_id: campaign.id, entity_type: 'group', status: 'failed', note: JSON.stringify(groupName) })
      }
    } else {

    }
  }
}

exports.topIPCampaign = async (req, res) => {
  try {

    const data = await sequelize.query(`
      SELECT ip, 
        COUNT(DISTINCT entity_id) AS count_ip
      FROM 
        ${prefixTableName('campaign_events')}
      WHERE 
        entity_id IN (SELECT id FROM ${prefixTableName('email_logs')} WHERE campaign_id = '${req.params.id}')
      AND 
      event = 'click'
      GROUP BY 
      ip
      ORDER BY 
      count_ip DESC
      LIMIT 10
    `, { raw: true })

    handleResponse(res, { data: { items: data[0] || [] } })

  } catch (error) {
    handleError(error, req, res)
  }
}