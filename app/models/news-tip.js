module.exports = (sequelize, Sequelize) => {
  const News = sequelize.define('news_and_tips', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    title: {
      type: Sequelize.STRING
    },
    short_description: {
      type: Sequelize.TEXT('long')
    },
    type:{
      type: Sequelize.STRING,
      validate: {
        isIn: [['news', 'tip']],
      }
    },
    html_content: {
      type: Sequelize.TEXT('long')
    },
    link: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return News;
}