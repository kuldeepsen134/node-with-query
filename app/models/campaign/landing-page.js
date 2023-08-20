module.exports = (sequelize, Sequelize) => {
  const LandingPage = sequelize.define('landing_pages', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    title: {
      type: Sequelize.STRING,
    },
    file: {
      type: Sequelize.STRING,
    },
    language: {
      type: Sequelize.STRING,
    },
    html_content: {
      type: Sequelize.TEXT('long')
    },
    capture_submitted_data: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    capture_password: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    redirect_url: {
      type: Sequelize.STRING,
    },
    complexity: {
      type: Sequelize.STRING,
      validate: {
        isIn: [['high', 'low', 'medium']],
      }
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'deleted', 'draft']],
      }
    },
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return LandingPage;
}