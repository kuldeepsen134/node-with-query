module.exports = (sequelize, Sequelize) => {
  const Group = sequelize.define('groups', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: Sequelize.STRING,
    },
    slug: {
      type: Sequelize.STRING
    },
    type: {
      type: Sequelize.STRING,
      validate: {
        isIn: [['group', 'tag', 'department']],
      }
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'deleted']],
      }
    },
    description: {
      type: Sequelize.TEXT('long')
    },
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return Group
}