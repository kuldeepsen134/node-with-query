module.exports = (sequelize, Sequelize) => {
  const Session = sequelize.define('sessions', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    device_id: {
      type: Sequelize.STRING,
    },
    access_token: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4
    },
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return Session
}