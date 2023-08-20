module.exports = (sequelize, Sequelize) => {
  const GroupRelationShip = sequelize.define('groups_relationships', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    group_id: {
      type: Sequelize.UUID
    },
    user_id: {
      type: Sequelize.UUID
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return GroupRelationShip
}