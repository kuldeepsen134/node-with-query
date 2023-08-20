const Joi = require('joi')

//Address validation
const addressSchema = {
  address: Joi.string().allow(null, ''),
  city: Joi.string().allow(null, ''),
  state: Joi.string().allow(null, ''),
  country: Joi.string().allow(null, ''),
  postcode: Joi.string().allow(null, ''),
}

//Create company validation
const createCompanySchema = Joi.object().keys({
  ...addressSchema,
  company_name: Joi.string().required(),
  company_email: Joi.string().required(),
  industry_id: Joi.string().allow(null, ''),
  website: Joi.string().allow(null, '')
}).options({allowUnknown: true})

//Update company validation
const updateCompanySchema = Joi.object().keys({
  ...addressSchema,
  company_name: Joi.string().allow(null, ''),
  company_email: Joi.string().allow(null, ''),
  phone_number: Joi.string().allow(null, ''),
  industry_id: Joi.string().allow(null, ''),
  website: Joi.string().allow(null, '')
}).options({allowUnknown: true})

//Create industry validation
const createIndustrySchema = Joi.object().keys({
  title: Joi.string().required(),
  description: Joi.string().allow(null, '')
}).options({ allowUnknown: true })

//Update industry validation
const updateIndustrySchema = Joi.object().keys({
  title: Joi.string().allow(null, ''),
  description: Joi.string().allow(null, '')
}).options({ allowUnknown: true })

//Export all validation
module.exports = {
  createCompanySchema,
  updateCompanySchema,
  createIndustrySchema,
  updateIndustrySchema
}


