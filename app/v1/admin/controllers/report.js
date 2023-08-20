//Import models database
const {
  Campaign,
  User,
  sequelize,
  Course,
  EmailTemplate,
  LandingPage,
  TrackEvent,
  CampaignGophish
} = require('app/models')

// Import utility functions and modules
const { handleResponse, prefixTableName, handleError } = require('app/utils');
const { Op } = require('sequelize');

exports.getCampaignsAverage = async (req, res) => {
  let query = '';
  let query1 = '';

  if (
    req?.query?.start_date &&
    req?.query?.end_date &&
    req?.query?.start_date?.length > 0 &&
    req?.query?.end_date?.length > 0
  ) {
    const startDate = new Date(req.query.start_date);
    const endDate = new Date(req.query.end_date);

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    const formattedStartDate = startDate.toISOString();
    const formattedEndDate = endDate.toISOString();

    query = `WHERE "${prefixTableName('campaigns')}".created_at BETWEEN '${formattedStartDate}' AND '${formattedEndDate}'`;
    query1 = `AND b.created_at BETWEEN '${formattedStartDate}' AND '${formattedEndDate}'`;
  }

  const companyID = req.query.company_id ? req.query.company_id : req.headers.company_id;

  let companyId = '';
  let companyId1 = '';

  if (companyID) {
    companyId = req?.query?.start_date?.length > 0 &&
      req?.query?.end_date?.length > 0 ? `AND "${prefixTableName('campaigns')}".company_id = '${companyID}'` : `WHERE "${prefixTableName('campaigns')}".company_id = '${companyID}'`;
    companyId1 = `AND b.company_id = '${companyID}'`;
  }

  try {
    const total = await sequelize.query(`
      SELECT
        COUNT(*),
        b.id AS campaign_id,
        b.title,
        b.created_at,
        b.updated_at
      FROM 
        "${prefixTableName('email_logs')}" AS a,
        "${prefixTableName('campaigns')}" AS b
      WHERE
        b.id = a.campaign_id
        ${query1}
        ${companyId1}
      GROUP BY
        a.campaign_id,
        b.id
    `);

    const events = await sequelize.query(`
      SELECT 
        COUNT(*),
        x.event, 
        x.campaign_id
      FROM (
        SELECT
          a.event, 
          b.campaign_id
        FROM 
          "${prefixTableName('campaign_events')}" AS a
        JOIN
          "${prefixTableName('email_logs')}" AS b ON b.id = a.entity_id
        WHERE
          b.campaign_id IN (
            SELECT id FROM "${prefixTableName('campaigns')}"
            ${query}
            ${companyId}
          )
        GROUP BY 
          a.event,
          a.entity_id,
          b.campaign_id
      ) as x
      GROUP BY 
        x.event,
        x.campaign_id
    `);

    /*
    const events = await sequelize.query(`
      SELECT
        COUNT(*), 
        a.event, 
        b.campaign_id
      FROM 
        "${prefixTableName('campaign_events')}" AS a
      JOIN
        "${prefixTableName('email_logs')}" AS b ON b.id = a.entity_id
      WHERE
        b.campaign_id IN (
          SELECT id FROM "${prefixTableName('campaigns')}"
          ${query}
          ${companyId}
        )
      GROUP BY 
        a.event, 
        b.campaign_id;
    `);
    */

    handleResponse(res, { data: { total: total[0], events: events[0] } });
  } catch (error) {
    handleError(error, req, res);
  }
};

exports.getCompanyStats = async (req, res) => {
  const companyIds = req?.query?.company_id || req.headers.company_id;

  const where = { company_id: { [Op.or]: [`${companyIds}`, null] } }

  const users = await User.count({ where: { company_id: req?.query?.company_id || req.headers.company_id, status: 'active' } });
  const campaigns = await Campaign.count({ where: where });
  const templates = await EmailTemplate.count({ where: where });
  const trainings = await Course.count({ where: where });
  const landingPages = await LandingPage.count({ where: where });

  handleResponse(res, {
    data: {
      users: users,
      campaigns: campaigns,
      email_templates: templates,
      trainings: trainings,
      landing_pages: landingPages
    }
  });
};

exports.getAllEvents = async (req, res) => {
  let query = '';

  if (
    req?.query?.start_date &&
    req?.query?.end_date &&
    req?.query?.start_date?.length > 0 &&
    req?.query?.end_date?.length > 0
  ) {
    const startDate = new Date(req.query.start_date);
    const endDate = new Date(req.query.end_date);

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    const formattedStartDate = startDate.toISOString();
    const formattedEndDate = endDate.toISOString();

    query = `WHERE "${prefixTableName('campaigns')}".created_at BETWEEN '${formattedStartDate}' AND '${formattedEndDate}'`;
  }

  const companyID = req.query.company_id ? req.query.company_id : null;
  let companyId = '';

  if (companyID) {
    companyId = `AND "${prefixTableName('campaigns')}".company_id = '${companyID}'`;
  }

  let whereCampaignID = '';
  const campaignID = req.query.campaign_id ? req.query.campaign_id : null;

  if (campaignID) {
    whereCampaignID = `b.campaign_id = '${campaignID}' AND `;
  }

  try {
    const [results] = await sequelize.query(`
      SELECT DISTINCT ON (a.entity_id, a.event)
        a.id,
        a.entity_id,
        a.event,
        a.useragent,
        a.bot,
        a.ip,
        a.submitted_data,
        a.note,
        a.created_at,
        a.updated_at
      FROM 
        "${prefixTableName('campaign_events')}" AS a
      JOIN 
        "${prefixTableName('email_logs')}" AS b ON a.entity_id = b.id
      WHERE
        ${whereCampaignID}
        b.campaign_id IN (
          SELECT id FROM "${prefixTableName('campaigns')}"
          ${query}
          ${companyId}
        )
      GROUP BY
        a.id,
        a.entity_id,
        a.event
      ORDER BY
        a.entity_id,
        a.event,
        a.created_at DESC     
    `);

    /*
    SELECT DISTINCT ON (a.entity_id, a.event)
      a.id,
      a.entity_id,
      a.event,
      a.useragent,
      a.bot,
      a.ip,
      a.submitted_data,
      a.note,
      a.created_at,
      a.updated_at
    FROM 
      "ps_campaign_events" AS a
    JOIN 
      "ps_email_logs" AS b ON a.entity_id = b.id
    WHERE
      a.event = 'open'
      AND
      b.campaign_id = 'a15daa41-56d6-4e04-8f0c-bc0b7ff6366c'
      AND 
      b.campaign_id IN (
        SELECT id FROM "ps_campaigns"
      )
    ORDER BY
      a.entity_id,
      a.event,
      a.created_at DESC;
    */

    handleResponse(res, { data: results });
  } catch (error) {
    handleError(error, req, res);
  }
};