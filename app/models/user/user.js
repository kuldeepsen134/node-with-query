const { sendEmail } = require('app/send-email')
module.exports = (sequelize, Sequelize, res) => {
  const User = sequelize.define('users', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    first_name: {
      type: Sequelize.STRING
    },
    last_name: {
      type: Sequelize.STRING
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: { args: true, msg: 'Account already exists with the email.' },
      validate: {
        isEmail: true
      }
    },
    phone_number: {
      type: Sequelize.STRING
    },
    employee_id: {
      type: Sequelize.STRING
    },
    role: {
      type: Sequelize.STRING,
      defaultValue: 'user',
      validate: {
        isIn: [['administrator', 'super_administrator', 'user', 'demo_user']],
      }
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'suspended', 'deleted']],
      }
    },
    address: {
      type: Sequelize.STRING
    },
    country: {
      type: Sequelize.STRING
    },
    state: {
      type: Sequelize.STRING
    },
    city: {
      type: Sequelize.STRING
    },
    otp: {
      type: Sequelize.INTEGER,
      validate: {
        min: 6
      }
    },
    postcode: {
      type: Sequelize.STRING
    },
    title: {
      type: Sequelize.STRING
    },
    language: {
      type: Sequelize.STRING
    },
    gender: {
      type: Sequelize.STRING
    },
    is_deletable: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
  )

  User.afterCreate(async (user, options) => {
    await sendEmail({ email: user.dataValues.email, subject: 'Your account is created', fileName: 'create-account', res: res, first_name: user.dataValues.first_name })
  })

  return User
}