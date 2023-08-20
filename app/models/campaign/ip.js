module.exports = (sequelize, Sequelize) => {
  const IPList = sequelize.define('ip_list', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    cidr: {
      type: Sequelize.STRING,
    },
    ip_range: {
      type: Sequelize.STRING,
    },
    note: {
      type: Sequelize.TEXT('long')
    },
    verified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'enabled',
      validate: {
        isIn: [['enabled', 'disabled']],
      }
    },
    useragent: {
      type: Sequelize.TEXT('long')
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      name: {
        plural: 'ip_list'
      }
    }
  )

  return IPList;
}