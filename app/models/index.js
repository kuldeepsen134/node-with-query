const Sequelize = require('sequelize')

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  operatorsAliases: 0,
  logging: console.log,
  // dialectOptions: {
  //   useUTC: false,
    // dateStrings: true,
    // typeCast: true
  // },
  // timezone: '+05:30', // for writing to database
  hooks: {
    beforeDefine: function (columns, model) {
      model.tableName = `${process.env.DB_TABLE_PREFIX}` + model.name.plural
    }
  }
});

const db = {
  sequelize: sequelize,
  User: require('./user/user')(sequelize, Sequelize),
  Session: require('./user/session')(sequelize, Sequelize),
  Course: require('./campaign/course')(sequelize, Sequelize),
  Company: require('./company/company')(sequelize, Sequelize),
  Campaign: require('./campaign/campaign')(sequelize, Sequelize),
  EmailTemplate: require('./email/template')(sequelize, Sequelize),
  Category: require('./category')(sequelize, Sequelize),
  GroupRelationship: require('./group/group-relationship')(sequelize, Sequelize),
  TagRelationship: require('./tag-relationship')(sequelize, Sequelize),
  Tag: require('./tag')(sequelize, Sequelize),
  SendingProfile: require('./email/sending-profile')(sequelize, Sequelize),
  TrackEvent: require('./campaign/track-event')(sequelize, Sequelize),
  Industry: require('./company/industry')(sequelize, Sequelize),
  Group: require('./group/group')(sequelize, Sequelize),
  Media: require('./media')(sequelize, Sequelize),
  LandingPage: require('./campaign/landing-page')(sequelize, Sequelize),
  CampaignAudience: require('./campaign/audience')(sequelize, Sequelize),
  EmailLog: require('./campaign/email-log')(sequelize, Sequelize),
  IPList: require('./campaign/ip')(sequelize, Sequelize),
  useragentList: require('./campaign/user-agent')(sequelize, Sequelize),
  Domain: require('./campaign/domain')(sequelize, Sequelize),
  EmailTemplateTraining: require('./campaign/email-template-trainings')(sequelize, Sequelize),
  Question: require('./campaign/question')(sequelize, Sequelize),
  QuestionOption: require('./campaign/question-option')(sequelize, Sequelize),
  CourseResult: require('./campaign/course-result')(sequelize, Sequelize),
  Assignment: require('./campaign/training-assignment')(sequelize, Sequelize),
  NewsAndTip: require('./news-tip')(sequelize, Sequelize),
  AssignmentAudience: require('./campaign/training-audience')(sequelize, Sequelize),
  AssignmentCourse: require('./campaign/training-assignment-course')(sequelize, Sequelize),
  AssignmentsEvent: require('./campaign/assignments-event')(sequelize, Sequelize),
  BreachData: require('./breach/breach-data')(sequelize, Sequelize),
  BreachSyncHistory: require('./breach/breach-sync-history')(sequelize, Sequelize),
  Family: require('./family')(sequelize, Sequelize),
  AssignmentEmailLog: require('./campaign/assignment-email-log')(sequelize, Sequelize),
  DarkWeb: require('./breach/dark-web')(sequelize, Sequelize),
  CampaignGophish: require('./campaign/campaign-gophish')(sequelize, Sequelize)
}

module.exports = db

// Association section

db.User.hasMany(db.Session, { foreignKey: { name: 'user_id', allowNull: false } })
db.Session.belongsTo(db.User, { foreignKey: { name: 'user_id', allowNull: false } })

db.Industry.hasMany(db.Company, { foreignKey: { name: 'industry_id', allowNull: true } })
db.Company.belongsTo(db.Industry, { foreignKey: { name: 'industry_id', allowNull: true } })

db.Assignment.hasMany(db.EmailTemplateTraining, { foreignKey: { name: 'training_assign_id', allowNull: true } })
db.EmailTemplateTraining.belongsTo(db.Assignment, { foreignKey: { name: 'training_assign_id', allowNull: true } })

db.Company.hasMany(db.User, { foreignKey: { name: 'company_id', allowNull: true } })
db.User.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: true } })

db.Company.hasMany(db.Tag, { foreignKey: { name: 'company_id', allowNull: true } })
db.Tag.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: true } })

db.Company.hasMany(db.Category, { foreignKey: { name: 'company_id', allowNull: true } })
db.Category.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: true } })

db.Company.hasMany(db.Course, { foreignKey: { name: 'company_id', allowNull: true } })
db.Course.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: true } })

db.User.hasMany(db.Campaign, { foreignKey: { name: 'created_by', allowNull: false } })
db.Campaign.belongsTo(db.User, { foreignKey: { name: 'created_by', allowNull: false } })

db.User.hasMany(db.LandingPage, { foreignKey: { name: 'created_by', allowNull: true } })
db.LandingPage.belongsTo(db.User, { foreignKey: { name: 'created_by', allowNull: true } })

db.Company.hasMany(db.Campaign, { foreignKey: { name: 'company_id', allowNull: false } })
db.Campaign.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: false } })

db.Company.hasMany(db.EmailTemplate, { foreignKey: { name: 'company_id', allowNull: true } })
db.EmailTemplate.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: true } })

db.Company.hasMany(db.LandingPage, { foreignKey: { name: 'company_id', allowNull: true } })
db.LandingPage.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: true } })

db.Company.hasMany(db.NewsAndTip, { foreignKey: { name: 'company_id', allowNull: true } })
db.NewsAndTip.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: true } })

db.LandingPage.hasMany(db.Campaign, { foreignKey: { name: 'landing_page_id', allowNull: true } })
db.Campaign.belongsTo(db.LandingPage, { foreignKey: { name: 'landing_page_id', allowNull: true } })

db.User.hasMany(db.EmailTemplate, { foreignKey: { name: 'created_by', allowNull: false } })
db.EmailTemplate.belongsTo(db.User, { foreignKey: { name: 'created_by', allowNull: false } })

db.EmailTemplate.hasMany(db.Campaign, { foreignKey: { name: 'email_template_id', allowNull: true } })
db.Campaign.belongsTo(db.EmailTemplate, { foreignKey: { name: 'email_template_id', allowNull: true } })

db.EmailTemplateTraining.hasMany(db.Campaign, { foreignKey: { name: 'email_template_id', allowNull: true } })
db.Campaign.belongsTo(db.EmailTemplateTraining, { foreignKey: { name: 'email_template_id', allowNull: true } })

db.Course.hasMany(db.Question, { foreignKey: { name: 'course_id', allowNull: true } })
db.Question.belongsTo(db.Course, { foreignKey: { name: 'course_id', allowNull: true } })

db.Question.hasMany(db.QuestionOption, {as: 'options', foreignKey: { name: 'question_id', allowNull: true } })
db.QuestionOption.belongsTo(db.Question, {as: 'options', foreignKey: { name: 'question_id', allowNull: true } })

db.SendingProfile.hasMany(db.Campaign, { foreignKey: { name: 'sending_profile_id', allowNull: true } })
db.Campaign.belongsTo(db.SendingProfile, { foreignKey: { name: 'sending_profile_id', allowNull: true } })

db.Domain.hasMany(db.Campaign, { foreignKey: { name: 'domain_id', allowNull: true } })
db.Campaign.belongsTo(db.Domain, { foreignKey: { name: 'domain_id', allowNull: true } })

db.Company.hasMany(db.SendingProfile, { foreignKey: { name: 'company_id', allowNull: true } })
db.SendingProfile.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: true } })

db.Company.hasMany(db.Group, { foreignKey: { name: 'company_id', allowNull: false } })
db.Group.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: false } })

db.Category.hasMany(db.EmailTemplate, { foreignKey: { name: 'category_id', allowNull: true } })
db.EmailTemplate.belongsTo(db.Category, { foreignKey: { name: 'category_id', allowNull: true } })

db.Company.hasMany(db.Domain, { foreignKey: { name: 'company_id', allowNull: true } })
db.Domain.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: true } })

db.SendingProfile.hasMany(db.Assignment, { foreignKey: { name: 'sending_profile_id', allowNull: true } })
db.Assignment.belongsTo(db.SendingProfile, { foreignKey: { name: 'sending_profile_id', allowNull: true } })

db.Company.hasMany(db.Assignment, { foreignKey: { name: 'company_id', allowNull: true } })
db.Assignment.belongsTo(db.Company, { foreignKey: { name: 'company_id', allowNull: true } })

// db.sequelize.sync({ alter: true}).then(() => { console.log('Yes re-sync') })