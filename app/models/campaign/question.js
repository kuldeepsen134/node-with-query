module.exports = (sequelize, Sequelize) => {
  const Question = sequelize.define('questions', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    title: {
      type: Sequelize.STRING
    },
    description: {
      type: Sequelize.TEXT('long')
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return Question
}