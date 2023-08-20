module.exports = (sequelize, Sequelize) => {
  const Campaign = sequelize.define('campaigns', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    title: {
      type: Sequelize.STRING
    },
    type: {
      type: Sequelize.STRING,
      defaultValue: 'phishing',
      validate: {
        isIn: [['phishing', 'advance']],
      }
    },
    language: {
      type: Sequelize.STRING
    },
    description: {
      type: Sequelize.TEXT('long')
    }, 
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'draft', 'running', 'stopped', 'completed', 'test']],
      }
    },
    start_date: {
      type: Sequelize.DATEONLY
    },
    end_date: {
      type: Sequelize.DATEONLY
    },
    start_time: {
      type: Sequelize.INTEGER
    },
    end_time: {
      type: Sequelize.INTEGER
    },
    time_zone: {
      type: Sequelize.STRING
    },
    days: {
      type: Sequelize.STRING
    },
    gophish_id: {
      type: Sequelize.STRING
    },
    gophish_api_url: {
      type: Sequelize.STRING
    },
    gophish_api_key: {
      type: Sequelize.STRING
    },
    gophish_data: {
      type: Sequelize.TEXT('long')
    },
    success_event_type: {
      type: Sequelize.STRING,
      validate: {
        isIn: [['click', 'captured']],
      }
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      timestamp: true
    }
  )

  return Campaign
}