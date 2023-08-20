module.exports = (sequelize, Sequelize) => {
  const TagRelationShip = sequelize.define('tags_relationships', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    tag_id: {
      type: Sequelize.UUID
    },
    entity_id: {   
      type: Sequelize.UUID
    } 
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return TagRelationShip
}