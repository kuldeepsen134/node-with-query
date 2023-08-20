const Joi = require("joi")

//Create group validation
const createGroupValidatorSchema = Joi.object().keys({
  title: Joi.string().required(),
  type: Joi.string().required(),
  description: Joi.string().allow(null, '')
}).options({ allowUnknown: true })

//Update group validation
const updateGroupValidatorSchema = Joi.object().keys({
  title: Joi.string().allow(null, ''),
  type: Joi.string().allow(null, ''),
  description: Joi.string().allow(null, '')
}).options({ allowUnknown: true })

//Export all validation
module.exports = {
  createGroupValidatorSchema,
  updateGroupValidatorSchema
}