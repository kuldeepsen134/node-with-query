module.exports = (sequelize, Sequelize) => {
    const Domain = sequelize.define('domain', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      title: {
        type: Sequelize.STRING,
        unique: true,
        validate: {
          isUrl: true
        }
      },
      ip: {
        type: Sequelize.STRING
      },
      expiry_date: {
        type: Sequelize.DATE
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'active',
        validate: {
          isIn: [['active', 'pending', 'inactive']],
        }
      }
    },
      {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      }
    )
  
    return Domain
  }