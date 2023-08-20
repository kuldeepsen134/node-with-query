module.exports = (sequelize, Sequelize) => {
  const EmailLogs = sequelize.define('email_logs', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    campaign_id: {
      type: Sequelize.UUID,
    },
    user_email: {
      type: Sequelize.STRING,
    },
    user_id: {
      type: Sequelize.UUID
    },
    note: {
      type: Sequelize.TEXT('long')
    },
    email_content: {
      type: Sequelize.TEXT('long')
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'schedule', 'cancelled', 'sent', 'send_failed']],
      }
    },
    // full_name: {
    //   type: Sequelize.STRING
    // },
    secret_key: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    placeholders: {
      type: Sequelize.TEXT('long')
    },
    email_template: {
      type: Sequelize.TEXT('long')
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return EmailLogs;
}