module.exports = (sequelize, Sequelize) => {
  const Company = sequelize.define('companies', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    company_name: {
      type: Sequelize.STRING
    },
    company_id: {
      type: Sequelize.STRING
    },
    company_email: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    phone_number: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        len: [10, 13]
      }
    },
    website: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    address: {
      type: Sequelize.STRING
    },
    country: {
      type: Sequelize.STRING
    },
    state: {
      type: Sequelize.STRING
    },
    city: {
      type: Sequelize.STRING
    },
    postcode: {
      type: Sequelize.STRING
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'draft', 'suspended', 'onhold', 'deleted']],
      }
    }
  },
    { 
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return Company
}