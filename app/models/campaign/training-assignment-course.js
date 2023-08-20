module.exports = (sequelize, Sequelize) => {
    const AssignmentCourse = sequelize.define('training_assignment_courses', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      assignment_id: {
        type: Sequelize.UUID,
      },
      course_id: {
        type: Sequelize.UUID,
      },
      due_date: {
        type: Sequelize.DATE
      }
    },
      {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        // https://stackoverflow.com/questions/21114499/how-to-make-sequelize-use-singular-table-names
      }
    )
  
    return AssignmentCourse;
  }