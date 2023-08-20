//Import models database
const { BreachData, sequelize, User, Family } = require('app/models')

// Import utility functions and modules
const { handleError, handleResponse, prefixTableName } = require('app/utils');
const { Op } = require('sequelize');

exports.getBreachesStats = async (req, res) => {
  try {
    var where = ''

    if (req.query.type === 'family') {
      where = `(
        SELECT email 
          FROM ${prefixTableName('family_members')} 
          WHERE 
          user_id = '${req.headers.user_id}' AND type = 'family'
      )`
    } else {
      where = `(
        SELECT email 
          FROM ${prefixTableName('family_members')} 
          WHERE 
          user_id = '${req.headers.user_id}' AND type = 'self'
        )`
    }

    const q1 = `
        SELECT database_name, created_at, updated_at
        FROM ${prefixTableName('breach_data')} 
        WHERE 
        email in ${where}
        ORDER BY
        created_at desc limit 1
    `;

    const q2 = `
        SELECT COUNT(*)
        FROM 
          "${prefixTableName('breach_data')}"
        WHERE 
          email IN ${where};
    `;

    const q3 = `
        SELECT 
          COUNT(DISTINCT database_name)
        FROM 
          "${prefixTableName('breach_data')}"
        WHERE 
          email IN ${where};
    `;

    const q4 = `
        SELECT COUNT(password)
        FROM 
          "${prefixTableName('breach_data')}"
        WHERE 
          email IN ${where}
        AND 
          password <> '';
    `;

    const q5 = `
        SELECT 
          COUNT(hashed_password)
        FROM 
          "${prefixTableName('breach_data')}"
        WHERE 
          email IN ${where}
        AND 
          hashed_password <> '';
    `;

    const q6 = `
        SELECT COUNT(*)
        FROM 
          "${prefixTableName('breach_data')}"
        WHERE 
          email IN (SELECT email FROM ${prefixTableName('users')} WHERE id = '${req.headers.user_id}');
    `;

    const q7 = `
        SELECT 
          COUNT(email), email
        FROM 
          "${prefixTableName('breach_data')}"
        WHERE 
          email IN ${where}
        GROUP BY 
          email
        ORDER BY 
          COUNT(email) DESC 
        LIMIT 1
    `;

    let data = {}

    if (req.query.type === 'family') {
      data.topBreach =  await sequelize.query(q7, { plain: true, raw: true });
    } else {
      data.sources = await sequelize.query(q3, { plain: true, raw: true });
      data.hashed_password = await sequelize.query(q5, { plain: true, raw: true });
      data.last_breach = await sequelize.query(q1, { plain: true, raw: true });
      data.corporate = await sequelize.query(q6, { plain: true, raw: true });
    }

    data.password = await sequelize.query(q4, { plain: true, raw: true });
    data.entries = await sequelize.query(q2, { plain: true, raw: true });


    handleResponse(res, { data: data });
  } catch (error) {
    handleError(error, req, res);
  }
};

exports.getBreachData = async (req, res) => {
  try {
    Family.findAll({
      where: { user_id: req.headers.user_id, type: {[Op.in] : req.query.type === 'family' ? ['family'] : ['self', 'corporate']} },
      attributes: [
        'email',
        [
          sequelize.literal(`(
          SELECT 
              Count(*) 
          FROM 
              ${prefixTableName('breach_data')}    
          WHERE           
              email = family_members.email
          GROUP BY email
        )`),
          'total_breaches'
        ]
      ],
    }).then((data) => {

      handleResponse(res, { data: data })
    })

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