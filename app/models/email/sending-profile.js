module.exports = (sequelize, Sequelize) => {
  const SendingProfile = sequelize.define('sending_profiles', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    encryption: {
      type: Sequelize.STRING,
      validate: {
        isIn: [['none', 'starttls', 'ssl/tls']],
      }
    },
    host: {
      type: Sequelize.STRING
    },
    port: {
      type: Sequelize.INTEGER
    },
    user_name: {
      type: Sequelize.STRING
    },
    password: {
      type: Sequelize.STRING
    },
    label: {
      type: Sequelize.STRING
    },
    description: {
      type: Sequelize.TEXT('long')
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'deleted']],
      }
    },
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return SendingProfile;
}