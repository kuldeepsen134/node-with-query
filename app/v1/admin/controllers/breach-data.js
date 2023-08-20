//Import models database
const { BreachData, BreachSyncHistory, sequelize } = require('app/models')

// Import utility functions and modules
const { handleError, axiosClient, handleResponse, getPagination, sortingData, getPagingResults, prefixTableName, strings } = require('app/utils')
const { handleSearchAndFilters } = require('./helper')
const { Op } = require('sequelize')

exports.getBreachData = async (req, res) => {

  const domain = await BreachSyncHistory.findOne({ where: { domain: req.query.domain }, raw: true })

  if (domain) {
    await BreachData.destroy({ where: { sync_history_id: domain.id } })
    await BreachSyncHistory.destroy({ where: { id: domain.id } })
  }

  try {
    const data = await axiosClient({ method: 'get', url: `https://api.dehashed.com/search?query=domain:${req.query.domain}&size=10000` })

    const pages = data.data.total / 10000

    if (data.data) {

      const breachSyncHistory = await BreachSyncHistory.create({ domain: req.query.domain, created_by: req.headers.user_id ? req.headers.user_id : 'cron' })

      data.data.entries.forEach(v => { v.sync_history_id = breachSyncHistory.dataValues.id });

      await BreachData.bulkCreate(data.data.entries)

      for (let index = 0; index < pages - 1; index++) {

        const data = await axiosClient({ method: 'get', url: `https://api.dehashed.com/search?query=domain:${req.query.domain}&size=10000&page=${index + 2}` })

        data?.data?.entries?.forEach(v => { v.sync_history_id = breachSyncHistory.dataValues.id });

        if (data?.data?.entries) {
          await BreachData.bulkCreate(data.data.entries)
        }
      }

      handleResponse(res, { data: { message: 'Breach data is successfully created', error: false } })
    }
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.getBreachDataHistory = async (req, res) => {
  try {
    // Extract the page and per_page query parameters from the request
    const { page, per_page } = req.query;

    // Get the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page);

    // Get the sorting parameters for the query
    const sortResponse = sortingData(req);

    // Find and count all campaigns with applied filters, sorting, limit, and offset
    BreachSyncHistory.findAndCountAll({
      where: handleSearchAndFilters(req, ['domain']), // Apply search and filter conditions
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

exports.getBreachesSuperAdmin = async (req, res) => {
  if (req.headers.role != 'super_administrator') {
    handleError(strings.YouDoNotAccess, req, res)
  }
  try {
    // Extract the page and per_page query parameters from the request
    const { page, per_page } = req.query;

    // Get the limit and offset values for pagination
    const { limit, offset } = getPagination(page, per_page);

    // Get the sorting parameters for the query
    const sortResponse = sortingData(req)

    var where = {
      [Op.and]: [
        handleSearchAndFilters(req, ['email', 'password', 'phone', 'username'])
      ]
    }

    if( req?.query?.company_id ){
      where.email = {
        [Op.in]: sequelize.literal(`
          (SELECT email
          FROM
            ${prefixTableName('users')} 
          WHERE
          company_id = '${req.query.company_id}'
          )`)
      }
    }

    BreachData.findAndCountAll({
      where: where,
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

exports.getBreachesBySource = async (req, res) => {
  const companyID = req.headers.role === 'super_administrator' ? req.query.company_id : req.headers.company_id

  if (!companyID) {
    handleError('Company id is required', req, res)
  }

  try {
    const data = await sequelize.query(`
      SELECT COUNT(*) AS count,
          SUM(CASE WHEN password <> '' THEN 1 ELSE 0 END) as pwd_breach_cnt,
          SUM(CASE WHEN email <> '' THEN 1 ELSE 0 END) as email_breach_cnt,
          SUM(CASE WHEN hashed_password <> '' THEN 1 ELSE 0 END) as hpwd_breach_cnt,
          SUM(CASE WHEN username <> '' THEN 1 ELSE 0 END) as usrname_breach_cnt,
          SUM(CASE WHEN name <> '' THEN 1 ELSE 0 END) as name_breach_cnt,
          SUM(CASE WHEN phone <> '' THEN 1 ELSE 0 END) as phone_breach_cnt,
          database_name,
          DATE(created_at) AS created_date
      FROM 
        ${prefixTableName('breach_data')}
      WHERE 
        email IN (SELECT email FROM ${prefixTableName('users')} WHERE status = 'active' AND company_id = '${companyID}')
      GROUP BY 
        database_name, 
        DATE(created_at)
      ORDER BY 
        database_name, 
        DATE(created_at)
    `)

    handleResponse(res, { data: { items: data[0] } })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.getBreachesByEmail = async (req, res) => {
  const companyID = req.headers.role === 'super_administrator' ? req.query.company_id : req.headers.company_id

  if (!companyID) {
    handleError('Company id is required', req, res)
  }

  try {

    const data = await sequelize.query(`
      SELECT COUNT(*),
        email,
        MAX(created_at)
      FROM 
        ${prefixTableName('breach_data')}
      WHERE 
        email IN (SELECT email FROM ${prefixTableName('users')} WHERE status = 'active' AND company_id = '${companyID}')
      GROUP BY 
        email
      ORDER BY 
        MAX(created_at) DESC
    `)

    handleResponse(res, { data: { items: data[0] } })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.getBreachesStats = async (req, res) => {
  var companyID = req.headers.role === 'super_administrator' ? req.query.company_id : req.headers.company_id

  if (!companyID) {
    handleError('Company id is required', req, res)
    return
  }

  try {
    let where = `(SELECT email FROM ${prefixTableName('users')} WHERE status = 'active' AND ${prefixTableName('users')}.company_id = '${companyID}')`

    const q1 = `
            SELECT COUNT(*) AS total_entries
            FROM ${prefixTableName('breach_data')}
            WHERE email IN ${where}
        `;

    const q2 = `
            SELECT COUNT(DISTINCT email) AS unique_emails,
                COUNT(DISTINCT database_name) AS sources
            FROM ${prefixTableName('breach_data')}
            WHERE email IN ${where}
        `;

    const q3 = `
            SELECT COUNT(password) AS password
            FROM ${prefixTableName('breach_data')}
            WHERE email IN ${where}
            AND password <> '';
        `;

    const q4 = `
            SELECT COUNT(hashed_password) AS hashed_password
            FROM ${prefixTableName('breach_data')}
            WHERE email IN ${where}
            AND hashed_password <> '';
        `;

    const q6 = `
        SELECT 
          database_name, created_at, updated_at 
        FROM 
          ${prefixTableName('breach_data')} 
        WHERE 
        email in ( SELECT email FROM ${prefixTableName('users')} WHERE company_id = '${companyID}') order by created_at desc limit 1
    `;

    const totalEntries = await sequelize.query(q1, { plain: true, raw: true });
    const data = await sequelize.query(q2, { plain: true, raw: true });
    const textPassword = await sequelize.query(q3, { plain: true, raw: true });
    const hashedPassword = await sequelize.query(q4, { plain: true, raw: true });
    const lastBreachData = await sequelize.query(q6, { plain: true, raw: true });

    handleResponse(res, {
      data: {
        total_entries: totalEntries.total_entries || 0,
        unique_emails: data.unique_emails || 0,
        sources: data.sources || 0,
        password: textPassword.password || 0,
        hashed_password: hashedPassword.hashed_password || 0,
        last_breach: lastBreachData
      }
    });
  } catch (error) {
    handleError(error, req, res);
  }
};

exports.getBreachesStatsSuperAdmin = async (req, res) => {
  if (req.headers.role != 'super_administrator') {
    handleError(strings.YouDoNotAccess, req, res)
  }

  try {
    const q1 = `SELECT COUNT(*) AS total_entries FROM ${prefixTableName('breach_data')}`;

    const q2 = `SELECT COUNT(DISTINCT email) AS unique_emails FROM ${prefixTableName('breach_data')}`;

    const q3 = `SELECT COUNT(DISTINCT database_name) AS sources FROM ${prefixTableName('breach_data')}`;

    const q4 = `SELECT COUNT(password) AS password FROM ${prefixTableName('breach_data')} WHERE password <> ''`;

    const q5 = `SELECT COUNT(hashed_password) AS hashed_password FROM ${prefixTableName('breach_data')} WHERE hashed_password <> ''`;

    const totalEntries = await sequelize.query(q1, { plain: true, raw: true });
    const uniqueEmails = await sequelize.query(q2, { plain: true, raw: true });
    const uniqueSources = await sequelize.query(q3, { plain: true, raw: true });
    const textPassword = await sequelize.query(q4, { plain: true, raw: true });
    const hashedPassword = await sequelize.query(q5, { plain: true, raw: true });

    handleResponse(res, {
      data: {
        entries: totalEntries.total_entries || 0,
        unique_emails: uniqueEmails.unique_emails || 0,
        sources: uniqueSources.sources || 0,
        password: textPassword.password || 0,
        hashed_password: hashedPassword.hashed_password || 0,
      }
    });
  } catch (error) {
    handleError(error, req, res);
  }
};

exports.breachExport = async (req, res) => {
  if (req.headers.role != 'super_administrator') {
    handleError(strings.YouDoNotAccess, req, res)
  }

  try {
    const data = await BreachData.findAll({
      where: { sync_history_id: req.query.history_id },
      attributes: ['email', 'username', 'password', 'hashed_password', 'phone', 'database_name']
    })

    handleResponse(res, { data: { items: data } })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.getBreachDataEmail = async (req, res) => {
  try {
    BreachData.findAll({ where: { email: req.params.email_id } }).then((data) => {
      handleResponse(res, { data: { items: data } })
    }).catch((error) => {
      handleError(error, req, res)
    })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.getBreachesDataBase = async (req, res) => {
  try {
    BreachData.findAll({
      attributes: [
        'database_name',
        [sequelize.fn('MAX', sequelize.col('email')), 'email'],
        [sequelize.fn('MAX', sequelize.col('created_at')), 'created_at'],
        [sequelize.fn('MAX', sequelize.col('updated_at')), 'updated_at'],
      ],
      group: ['database_name'],
    }).then((data) => {
      handleResponse(res, { data: { items: data } })
    })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.updateBreachData = async (req, res) => {
  try {
    BreachData.update({ status: req.body.status }, { where: { breach_id: req.params.id } }).then((data) => {
      if (data[0] === 1) {
        handleResponse(res, { message: strings.UpdateBreachData })
      } else {
        handleError(strings.NotFoundBreachData, req, res)
      }
    })
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.deleteBreachData = async (req, res) => {
  await BreachData.destroy({ where: { sync_history_id: req.params.id } })

  const data = await BreachSyncHistory.destroy({ where: { id: req.params.id } })

  data == 1 ? handleResponse(res, { message: strings.DeleteBreach }) :
    handleError(strings.NotFoundBreachData, req, res)
}