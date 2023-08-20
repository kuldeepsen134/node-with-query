module.exports = (sequelize, Sequelize) => {
  const Campaign = sequelize.define('training_assignment', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    training_name: {
      type: Sequelize.STRING
    },
    description: {
      type: Sequelize.TEXT('long')
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'running', 'draft', 'completed']],
      }
    },
    language: {
      type: Sequelize.STRING
    },
    assign_by: {
      type: Sequelize.UUID
    },
    start_date: {
      type: Sequelize.DATE
    },
    start_time: {
      type: Sequelize.STRING
    },
    time_zone: {
      type: Sequelize.STRING
    },
    days: {
      type: Sequelize.STRING
    },
    due_date: {
      type: Sequelize.DATE
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