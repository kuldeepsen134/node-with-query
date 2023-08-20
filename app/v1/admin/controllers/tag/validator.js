const Joi = require("joi")

//Create tag validation
const createTagSchema = Joi.object().keys({
  title: Joi.string().required(),
  slug: Joi.string().allow(null),
  description: Joi.string().allow(null, ''),
}).options({ allowUnknown: true })

//Update tag validation
const updateTagSchema = Joi.object().keys({
  title: Joi.string().required(),
  slug: Joi.string().allow(null),
  description: Joi.string().allow(null, ''),
}).options({ allowUnknown: true })

//Export all validation
module.exports = {
  createTagSchema,
  updateTagSchema,
}