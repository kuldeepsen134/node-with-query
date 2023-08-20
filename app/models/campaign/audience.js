module.exports = (sequelize, Sequelize) => {
  const CampaignAudience = sequelize.define('campaign_audience', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    campaign_id: {
      type: Sequelize.STRING,
    },
    exclude_list: {
      type: Sequelize.TEXT('long'),
    },
    audience_type: {
      type: Sequelize.STRING,
      validate: {
        isIn: [['all', 'group', 'department', 'tag']],
      }
    },
    audience_group_id: {
      type: Sequelize.STRING
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['deleted', 'active']],
      }
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      // https://stackoverflow.com/questions/21114499/how-to-make-sequelize-use-singular-table-names
      name: {
        plural: 'campaign_audience'
      }
    }
  )

  return CampaignAudience;
}