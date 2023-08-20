module.exports = (sequelize, Sequelize) => {
  const Course = sequelize.define('courses', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    title: {
      type: Sequelize.STRING
    },
    course_type: {
      type: Sequelize.STRING,
      defaultValue: 'video',
      validate: {
        isIn: [['course', 'video', 'poster']],
      }
    },
    passing_score: {
      type: Sequelize.INTEGER
    },
    duration: {
      type: Sequelize.STRING
    },
    language: {
      type: Sequelize.STRING
    },
    video_title: {
      type: Sequelize.STRING
    },
    video_url: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'draft']],
      }
    },
    description: {
      type: Sequelize.TEXT('long')
    },
    html_content: {
      type: Sequelize.TEXT('long')
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return Course
}