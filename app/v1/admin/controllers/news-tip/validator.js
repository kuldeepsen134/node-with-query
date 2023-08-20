const Joi = require("joi")

//Create News & tip validation
const createNewsAndTipValidatorSchema = Joi.object().keys({
    title: Joi.string().required(),
    type: Joi.string().required(),
    description: Joi.string().allow(null, '')
}).options({ allowUnknown: true })

//Export all validation
module.exports = {
    createNewsAndTipValidatorSchema
}