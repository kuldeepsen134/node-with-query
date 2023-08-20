module.exports = (sequelize, Sequelize) => {
  const TrackEvent = sequelize.define('campaign_events', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    entity_id: {
      type: Sequelize.UUID,
    },
    secret_key: {
      type: Sequelize.UUID,
    },
    event: {
      type: Sequelize.STRING,
      validate: {
        isIn: [['sent', 'open', 'click', 'success', 'captured', 'report', 'send_failed']],
      }
    },
    useragent: {
      type: Sequelize.TEXT('long')
    },
    useragent_raw: {
      type: Sequelize.STRING
    },
    os: {
      type: Sequelize.STRING
    },
    bot: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    ip: {
      type: Sequelize.STRING
    },
    submitted_data: {
      type: Sequelize.TEXT('long')
    },
    request_header: {
      type: Sequelize.TEXT('long')
    },
    note: {
      type: Sequelize.TEXT('long')
    },
    city: {
      type: Sequelize.STRING
    },
    state: {
      type: Sequelize.STRING
    },
    country: {
      type: Sequelize.STRING
    },
    location: {
      type: Sequelize.TEXT('long')
    }
  },
    {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return TrackEvent
}