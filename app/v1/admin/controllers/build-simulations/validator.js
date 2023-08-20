const Joi = require('joi')

//Create SMTP profile validation
const createSendingProfileSchema = Joi.object().keys({
    encryption: Joi.string().required(),
    host: Joi.string().required(),
    port: Joi.number().required(),
    port: Joi.number().required(),
    label: Joi.string().required()
}).options({ allowUnknown: true })

//Update SMTP profile validation
const updateSendingProfileSchema = Joi.object().keys({
    company_id: Joi.string().allow(null, ''),
    encryption: Joi.string().allow(null, ''),
    host: Joi.string().allow(null, ''),
    port: Joi.number().allow(null, ''),
}).options({ allowUnknown: true })

//Create email template validation
const createEmailTemplateSchema = Joi.object().keys({
    title: Joi.string().required(),
    html_content: Joi.string().allow(null, ''),
    from_name: Joi.string().required(),
    from_email: Joi.string().required(),
    subject: Joi.string().required(),
    category_id: Joi.string().required(),
    language: Joi.string().required(),
    complexity: Joi.string().required(),
    company_id: Joi.string().allow(null),
    tag_ids: Joi.array().items().min(1).required()
}).options({ allowUnknown: true })

//Update email template validation
const updateEmailTemplateSchema = Joi.object().keys({
    title: Joi.string().allow(null, ''),
    html_content: Joi.string().allow(null, ''),
    from_name: Joi.string().allow(null, ''),
    from_email: Joi.string().allow(null, ''),
    subject: Joi.string().allow(null, ''),
    category_id: Joi.string().allow(null, ''),
    language: Joi.string().allow(null, ''),
    company_id: Joi.string().allow(null),
    complexity: Joi.string().allow(null, ''),
}).options({ allowUnknown: true })

const sendTestEmailSchema = Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
    message: Joi.string().when('smtp', {
        is: Joi.exist(),
        then: Joi.allow(null, ''),
        otherwise: Joi.required()
    }),
    subject: Joi.string().when('smtp', {
        is: Joi.exist(),
        then: Joi.allow(null, ''),
        otherwise: Joi.required()
    }),
    from_name: Joi.string().when('smtp', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required()
    }),
    to_name: Joi.string().when('smtp', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required()
    }),
    sending_profile_id: Joi.string().when('smtp', {
        is: Joi.exist().not(null),
        then: Joi.forbidden(),
        otherwise: Joi.required()
    }),
    smtp: Joi.object().keys({
        host: Joi.string().required(),
        port: Joi.number().required(),
        user_name: Joi.string().required(),
        password: Joi.string().required()
    })
});



module.exports = {
    createSendingProfileSchema,
    updateSendingProfileSchema,
    createEmailTemplateSchema,
    updateEmailTemplateSchema,
    sendTestEmailSchema
}