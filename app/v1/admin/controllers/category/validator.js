const Joi = require("joi")

//Create category validation
const createCategorySchema = Joi.object().keys({
  title: Joi.string().required(),
  slug: Joi.string().allow(null),
  description: Joi.string().allow(null, ''),
}).options({ allowUnknown: true })

//Update category validation
const updateCategorySchema = Joi.object().keys({
  title: Joi.string().required(),
  slug: Joi.string().allow(null),
  description: Joi.string().allow(null, ''),
}).options({ allowUnknown: true })

//Export all validation
module.exports = {
  createCategorySchema,
  updateCategorySchema,
}