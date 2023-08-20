module.exports = (sequelize, Sequelize) => {
    const BreachData = sequelize.define('breach_data', {
      breach_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      email: {
        type: Sequelize.STRING,
      },
      ip_address: {
        type: Sequelize.STRING,
      },
      username: {
        type: Sequelize.STRING
      },
      password: {
        type: Sequelize.STRING
      },
      hashed_password: {
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      address: {
        type: Sequelize.STRING
      },
      phone: {
        type: Sequelize.STRING
      },
      database_name: {
        type: Sequelize.STRING
      },
      sync_history_id: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'open',
        validate: {
          isIn: [['open', 'in_mitigation', 'resolved']],
        }
      }
    },
      {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    )
  
    return BreachData;
  }