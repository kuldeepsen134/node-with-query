module.exports = (sequelize, Sequelize) => {
  const EmailTemplate = sequelize.define('email_templates', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    title: {
      type: Sequelize.STRING
    },
    language: {
      type: Sequelize.STRING
    },
    complexity: {
      type: Sequelize.STRING,
      validate: {
        isIn: [['high', 'low', 'medium']],
      }
    },
    description: {
      type: Sequelize.TEXT('long')
    },
    from_email: {
      type: Sequelize.STRING
    },
    from_name: { 
      type: Sequelize.STRING
    },
    subject: {
      type: Sequelize.STRING
    },
    html_content: {
      type: Sequelize.TEXT('long')
    },
    email_headers: {
      type: Sequelize.TEXT('long')
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'draft', 'deleted']],
      }
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return EmailTemplate
}