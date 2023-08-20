module.exports = (sequelize, Sequelize) => {
  const DarkWeb = sequelize.define('breach_data_dark_web', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    dark_market_id: {
      type: Sequelize.STRING,
    },
    database_name: {
      type: Sequelize.STRING,
    },
    domain: {
      type: Sequelize.STRING
    },
    discovered_date: {
      type: Sequelize.DATE
    },
    status: {
      type: Sequelize.STRING
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return DarkWeb;
}