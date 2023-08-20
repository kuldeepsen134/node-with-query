module.exports = (sequelize, Sequelize) => {
  const Category = sequelize.define('categories', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    title: {
      type: Sequelize.STRING,
    },
    slug: {
      type: Sequelize.STRING,
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

  return Category;
}