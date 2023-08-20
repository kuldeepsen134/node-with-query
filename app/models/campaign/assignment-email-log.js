module.exports = (sequelize, Sequelize) => {
    const AssignmentEmailLogs = sequelize.define('assignment_email_logs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      assignment_id: {
        type: Sequelize.UUID,
      },
      user_email: {
        type: Sequelize.STRING,
      },
      user_id: {
        type: Sequelize.UUID
      },
      note: {
        type: Sequelize.TEXT('long')
      },
      email_content: {
        type: Sequelize.TEXT('long')
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'sent', 'send_failed']],
        }
      },
      placeholders: {
        type: Sequelize.TEXT('long')
      },
      email_template: {
        type: Sequelize.TEXT('long')
      }
    },
      {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    )
  
    return AssignmentEmailLogs;
  }