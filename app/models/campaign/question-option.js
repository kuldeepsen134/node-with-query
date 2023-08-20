module.exports = (sequelize, Sequelize) => {
    const QuestionOption = sequelize.define('question_options', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      label: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT('long')
      },
      correct: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }
    },
      {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      }
    )
  
    return QuestionOption
  }