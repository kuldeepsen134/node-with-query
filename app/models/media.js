module.exports = (sequelize, Sequelize) => {
  const Media = sequelize.define('media', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    original_name: {
      type: Sequelize.STRING
    },
    path: {
      type: Sequelize.STRING
    },
    mime_data: {
      type: Sequelize.STRING
    },
    entity_id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4
    },
    key: {
      type: Sequelize.STRING
    },
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return Media;
}