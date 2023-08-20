module.exports = (sequelize, Sequelize) => {
  const useragentList = sequelize.define('useragent_list', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    useragent: {
      type: Sequelize.TEXT('long')
    },
    note: {
      type: Sequelize.TEXT('long')
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'enabled',
      validate: {
        isIn: [['enabled', 'disabled']],
      }
    },
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      name: {
        plural: 'useragent_list'
      }
    }
  )

  return useragentList;
}