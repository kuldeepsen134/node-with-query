const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { Op } = require('sequelize');
const { Session, User, Company } = require('app/models');
const { strings } = require('app/utils');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 100 requests per windowMs
});

const middlewareAdmin = express.Router();

middlewareAdmin.use(helmet());
middlewareAdmin.use(limiter);

middlewareAdmin.use(async (req, res, next) => {
  try {
    const { authorization, device_id } = req.headers;

    if (!authorization || !device_id) {
      return res.status(401).send({ message: strings.UnauthorizedAccess, error: true });
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const session = await Session.findOne({
      where: {
        access_token: authorization,
        device_id: device_id,
        created_at: { [Op.gte]: yesterday },
      },
      include: {
        model: User,
        where: {
          role: { [Op.in]: ['administrator', 'super_administrator'] }
        }
      }
    });

    if(session.user.company_id){
      const company = await Company.findOne({where: {id: session.user.company_id, status: 'active'}})
      
      if(!company){
        return res.status(401).send({ message: strings.YourCompany, error: true });
      }
    }

    if (session && session.user && session.user.id && session.device_id) {
      req.headers.user_id = session.user.id;
      req.headers.company_id = session.user.company_id;
      req.headers.role = session.user.role;

      return next();
    }

    return res.status(401).send({ message: strings.UnauthorizedAccess, error: true });
  } catch (error) {
    return res.status(500).send({ message: strings.InternalServerError, error: true });
  }
});

module.exports = middlewareAdmin;
