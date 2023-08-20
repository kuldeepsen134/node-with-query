module.exports = (sequelize, Sequelize) => {
    const AssignmentsEvent = sequelize.define('assignments_events', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      entity_id: {
        type: Sequelize.UUID,
      },
      assignment_id: {
        type: Sequelize.UUID,
      },
      course_id: {
        type: Sequelize.UUID
      },
      user_id: {
        type: Sequelize.UUID
      },
      event: {
        type: Sequelize.STRING,
        validate: {
          isIn: [['sent', 'start', 'watch', 'completed', 'report', 'send_failed']],
        }
      },
      useragent: {
        type: Sequelize.TEXT('long')
      },
      useragent_raw: {
        type: Sequelize.STRING
      },
      os: {
        type: Sequelize.STRING
      },
      bot: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      ip: {
        type: Sequelize.STRING
      },
      submitted_data: {
        type: Sequelize.TEXT('long')
      },
      request_header: {
        type: Sequelize.TEXT('long')
      },
      note: {
        type: Sequelize.TEXT('long')
      }
    },
      {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      }
    )
  
    return AssignmentsEvent
  }