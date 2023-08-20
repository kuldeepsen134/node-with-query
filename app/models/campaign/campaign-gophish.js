module.exports = (sequelize, Sequelize) => {
    const CampaignGophish = sequelize.define('campaign_gophish', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      campaign_id: {
        type: Sequelize.STRING
      },
      entity_id: {
        type: Sequelize.STRING
      },
      entity_type: {
        type: Sequelize.STRING
      },
      note: {
        type: Sequelize.TEXT('long')
      }, 
      status: {
        type: Sequelize.STRING,
        defaultValue: 'success',
        validate: {
          isIn: [['success', 'failed']],
        }
      }
    },
      {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        timestamp: true
      }
    )
  
    return CampaignGophish
  }