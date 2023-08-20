module.exports = (sequelize, Sequelize) => {
    const Family = sequelize.define('family_members', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      }, 
      email: {
        type: Sequelize.STRING,
      },
      user_id: {
        type: Sequelize.UUID,
      },
      relation: {
        type: Sequelize.STRING,
      },
      full_name: {
        type: Sequelize.STRING,
      },
      type: {
        type: Sequelize.STRING,
        validate: {
          isIn: [['family', 'self', 'corporate']],
        }
      },
    },
      {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    )
  
    return Family;
  }