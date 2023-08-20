const Joi = require("joi")

//Create family validation
const createFamilyValidatorSchema = Joi.object().keys({
  email: Joi.string().required(),
  type: Joi.string().required()
}).options({ allowUnknown: true })

//Export all validation
module.exports = {
  createFamilyValidatorSchema
}