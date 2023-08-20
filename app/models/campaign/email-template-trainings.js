module.exports = (sequelize, Sequelize) => {
  const EmailTemplateTraining = sequelize.define('email_template_trainings', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    type: {
      type: Sequelize.STRING,
      defaultValue: 'user',
      validate: {
        isIn: [['enrollment', 'completed', 'reminder']],
      }
    },
    html_content: {
      type: Sequelize.TEXT('long'),
    },
    time_zone: {
      type: Sequelize.STRING,
    },
    days: {
      type: Sequelize.STRING
    },
    from_name: {
      type: Sequelize.STRING
    },
    from_email: {
      type: Sequelize.STRING
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return EmailTemplateTraining;
}