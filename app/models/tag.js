module.exports = (sequelize, Sequelize) => {
  const Tag = sequelize.define('tags', {
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

  return Tag
}