const Joi = require('joi')

//Audience validation
const audienceSchema = Joi.object({
  exclude_list: Joi.array().required(),
  audience_type: Joi.string().required()
});

//Create campaign validation
const createCampaignSchema = Joi.object().keys({
  title: Joi.string().required(),
  type: Joi.string().required(),
  start_date: Joi.string().required(),
  end_date: Joi.string().required(),
  start_time: Joi.string().required(),
  end_time: Joi.string().required(),
  days: Joi.string().allow(null, ''),
  description: Joi.string().allow(null, ''),
  email_template_id: Joi.string().required(),
  landing_page_id: Joi.string().optional(),
  sending_profile_id: Joi.string().required(),
  domain_id: Joi.string().allow(null, ''),
  tag_ids: Joi.array().items().min(1).required(),
  audience: Joi.array().items(audienceSchema).min(1).required()
}).options({ allowUnknown: true })

//Update campaign validation
const updateCampaignSchema = Joi.object().keys({
  title: Joi.string().allow(null, ''),
  type: Joi.string().allow(null, ''),
  start_date: Joi.string().allow(null, ''),
  end_date: Joi.string().allow(null, ''),
  start_time: Joi.string().allow(null, ''),
  end_time: Joi.string().allow(null, ''),
  days: Joi.string().allow(null, ''),
  description: Joi.string().allow(null, ''),
  email_template_id: Joi.string().allow(null),
  sending_profile_id: Joi.string().allow(null, ''),
  domain_id: Joi.string().allow(null, ''),
}).options({ allowUnknown: true })

//Create landing page validation
const createLandingPageSchema = Joi.object().keys({
  title: Joi.string().required(),
  language: Joi.string().required(),
  html_content: Joi.string().required(),
  file: Joi.string().required(),
  company_id: Joi.string().allow(null),
  tag_ids: Joi.array().items().min(1).required()
}).options({ allowUnknown: true })

//Update landing page validation
const updateLandingPageSchema = Joi.object().keys({
  title: Joi.string().allow(null, ''),
  language: Joi.string().allow(null, ''),
  html_content: Joi.string().allow(null, ''),
  company_id: Joi.string().allow(null),
  file: Joi.string().allow(null, ''),
}).options({ allowUnknown: true })

//Create course validation
const createCourseSchema = Joi.object().keys({
  title: Joi.string().required(),
  video_title: Joi.string().required(),
  passing_score: Joi.number().required(),
  duration: Joi.number().required(),
  description: Joi.string().allow(null, ''),
  questions: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      description: Joi.string().allow(''),
      options: Joi.array().items(
        Joi.object({
          label: Joi.string().required(),
          correct: Joi.boolean().required(),
          description: Joi.string().allow('')
        })
      ).min(2).required()
    })
  ).min(1).required(),
  tag_ids: Joi.array().items().min(1).required()
}).options({ allowUnknown: true })

//Update course validation
const updateCourseSchema = Joi.object().keys({
  title: Joi.string().allow(null, ''),
  passing_score: Joi.number().allow(null, ''),
  duration: Joi.number().allow(null, ''),
  video_url: Joi.string().allow(null, ''),
  description: Joi.string().allow(null, '')
}).options({ allowUnknown: true })

//Create IP validation
const createIPSchema = Joi.object().keys({
  cidr: Joi.string().required(),
  // ip_range: Joi.string().required(),
  // verified: Joi.boolean().required(),
  // useragent: Joi.string().required(),
  note: Joi.string().allow(null, '')
}).options({ allowUnknown: true })

//Create user agent validation
const createuseragentSchema = Joi.object().keys({
  useragent: Joi.string().required(),
  note: Joi.string().allow(null, '')
}).options({ allowUnknown: true })

//Create track event validation
const createTrackEventSchema = Joi.object().keys({
  secret_key: Joi.string().required(),
  type: Joi.string().required(),
  submitted_data: Joi.object().allow(null, ''),
}).options({ allowUnknown: true })

//Create domain validation
const createDomainSchema = Joi.object().keys({
  title: Joi.string().required(),
  ip: Joi.string().required(),
  expiry_date: Joi.date().required()
}).options({ allowUnknown: true })

//Create domain validation
const updateDomainSchema = Joi.object().keys({
  title: Joi.string().allow(null, ''),
  ip: Joi.string().allow(null, ''),
  expiry_date: Joi.string().allow(null, '')
}).options({ allowUnknown: true })

//Question validation
const createQuestionSchema = Joi.array().items(
  Joi.object({
    title: Joi.string().required(),
    description: Joi.string().allow(''),
    options: Joi.array().items(
      Joi.object({
        label: Joi.string().required(),
        correct: Joi.boolean().required(),
        description: Joi.string().allow('')
      })
    ).min(4).required()
  })
).min(1).required();

//Course create validation
const createCourseResultSchema = Joi.array().items(
  Joi.object({
    question_id: Joi.string().required(),
    answer_id: Joi.string().required()
  })
).min(1).required()

//Create news validation
const createNewsSchema = Joi.object().keys({
  title: Joi.string().required(),
  html_content: Joi.string().required(),
  link: Joi.string().required(),
  short_description: Joi.string().required()
})

//Create training validation
const createTrainingSchema = Joi.object().keys({
  training_name: Joi.string().required(),
  language: Joi.string().required(),
  start_date: Joi.string().pattern(/^(\d{4})\/(\d{2})\/(\d{2})$/).required(),
  start_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3])[0-5][0-9]$/).required(),
  due_date: Joi.string().pattern(/^(\d{4})\/(\d{2})\/(\d{2})$/).required(),
  description: Joi.string().allow(null, ''),
  sending_profile_id: Joi.string().required(),
  tag_ids: Joi.array().items().min(1).required(),
  course_ids: Joi.array().items().min(1).required(),
  notifications: Joi.array().items(
    Joi.object({
      type: Joi.string().required(), 
      html_content: Joi.string().allow(null, '')
    })).min(1).required(),
  audience: Joi.array().items(audienceSchema).min(1).required()
}).options({ allowUnknown: true })

//Export all validation
module.exports = {
  createCampaignSchema,
  updateCampaignSchema,
  createLandingPageSchema,
  updateLandingPageSchema,
  createCourseSchema,
  updateCourseSchema,
  createIPSchema,
  createuseragentSchema,
  createTrackEventSchema,
  createDomainSchema,
  updateDomainSchema,
  createQuestionSchema,
  createCourseResultSchema,
  createNewsSchema,
  createTrainingSchema
}