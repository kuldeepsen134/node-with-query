module.exports = (sequelize, Sequelize) => {
    const BreachSyncHistory = sequelize.define('breach_sync_history', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      domain: {
        type: Sequelize.STRING,
      },
      created_by: {
        type: Sequelize.STRING
      }
    },
      {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    )
  
    return BreachSyncHistory;
  }