module.exports = (sequelize, Sequelize) => {
  const CourseResult = sequelize.define('course_results', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    course_id: {
      type: Sequelize.UUID
    },
    user_id: {
      type: Sequelize.UUID
    },
    question_id: {
      type: Sequelize.UUID
    },
    assignment_id: {
      type: Sequelize.UUID
    },
    answer_id: {
      type: Sequelize.UUID
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return CourseResult
}