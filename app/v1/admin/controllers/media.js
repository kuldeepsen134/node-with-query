// Import Media and User models from your application models.
const { Media, User } = require('app/models')

// Import various utility functions from your application utilities.
const {
  handleResponse,
  handleError,
  strings,
  getPagination,
  sortingData,
  getPagingResults,
  createUUID
} = require('app/utils')

// Import search and filter handling function from helper.
const { handleSearchAndFilters } = require('./helper')

// Import required core modules.
const fs = require('fs')
const path = require('path')

// Express router to setup routes.
var router = require('express').Router()

// Media routes module
module.exports = app => {
  try {
    // Multer is a node.js middleware used for handling multipart/form-data, which is mainly used for uploading files.
    const multer = require('multer')

    // Setup multer storage, which decides destination directory and filenames.
    const storage = multer.diskStorage({

      // Destination function defines the location where the files will be saved.
      destination: function (req, files, cb) {
        const path = 'app/uploads'
        // If the directory does not exist, it will create it.
        fs.mkdirSync(path, { recursive: true })
        // Callback function to be called when the destination is ready.
        cb(null, path)
      },

      // Filename function defines the name of the file to be saved.
      filename: function async(req, file, cb, res) {
        // Extract entity_id and key from request body.
        const { entity_id, key } = req.body

        // Create a random UUID.
        const randomNumber = createUUID()

        // Split the original file name by '.' to separate name and extension.
        const xyz = file.originalname.split('.')

        // Insert the random number into the file name.
        xyz.splice(1, 0, randomNumber)

        // Join the file name parts back together.
        const fileName = xyz.join('.')

        // Return the new filename to multer's storage.
        cb(null, fileName)

        // Create a data array and push the file object into it.
        let data = []
        data.push(file)

        // Map through the data array to create mediaData array.
        const mediaData = data?.map((item, i) => {
          // Extract the extension of the file.
          var afterDot = item.originalname.substr(item.originalname.indexOf('.'))
          // Get the dotIndex of the last dot in the file name.
          const dotIndex = item.originalname.lastIndexOf(".")
          // Get the file name without the extension.
          const result = item.originalname.substring(0, dotIndex)
          // Return a new object with properties required for mediaData.
          return {
            original_name: item.originalname,
            key: key,
            entity_id: entity_id,
            // Set the path to be the base url + the new filename + the file extension.
            path: `${process.env.IMAGE_BASE_URL}` + '/' + result + '.' + randomNumber + afterDot,
            // Set mime_data to be the mimetype of the file.
            mime_data: item.mimetype,
          }
        })

        // If the request method is POST, use Media's bulkCreate function to insert all mediaData into the Media model.
        if (req.method === 'POST') {
          Media.bulkCreate(mediaData)
        } else if (req.method === 'DELETE') {
          // If the request method is DELETE, find the media by the id in request parameters.
          Media.findByPk(req.params.id).then((data) => {

            // Get the image name from the path.
            const imageName = data.dataValues.path.substr(data.dataValues.path.indexOf('static/')).split('/').slice(1, 2).join('')

            // Define the directory path where the image is stored.
            const directoryPath = path.resolve(__dirname, '../../../uploads/')

            // Delete the image from the directory.
            fs.unlink(directoryPath + '/' + imageName, (err) => {
              if (err) {
                handleError('Image id not found', req, res)
              }
            })
          })
          // Media.update(mediaData[0], { where: { id: req.params.id } })
        } else if (req.method === 'PUT') {
          Media.findByPk(req.params.id).then((data) => {
            const imageName = data.dataValues.path.substr(data.dataValues.path.indexOf('static/')).split('/').slice(1, 2).join('')

            const directoryPath = path.resolve(__dirname, '../../../uploads/');

            fs.unlink(directoryPath + '/' + imageName, (err) => {
              if (err) {
                handleError('Could not delete the image.', req, res)
                return
              } 0

            })
          })

          Media.update(mediaData[0], { where: { id: req.params.id } })
        }
      }
    })

    // Create multer object.
    const upload = multer({ storage: storage })

    // Route to upload multiple media files. 
    router.post('/v1/admin/media', upload.array('files', 50), async (req, res) => {
      // When files are uploaded successfully, send a success message.
      if (req.files) {
        handleResponse(res, { messsage: `Files uploaded successfully in uploads Directory!!` })
      } else {
        handleError(strings.SelectFile, req, res)
      }
    })

    try {
      router.put('/v1/admin/media/:id', upload.single('files'), async (req, res) => {
        if (req.params.id) {
          handleResponse(res, {message: 'Image updated successfully'})
        } else {
          handleError('Image id not found', req, res)
        }
      })
    } catch (error) {
      handleError(error, req, res)
    }

    // An endpoint for deleting media data (specifically, a file).
    router.delete('/v1/admin/media/:id', upload.single('files'), async (req, res) => {
      // Check if an ID has been provided in the request parameters.
      if (req.params.id) {
        // If ID is present, find the Media entry by its primary key (ID).
        await Media.findByPk(req.params.id).then((data) => {
          // Extract the image name from the image path.
          const imageName = data?.dataValues?.path?.substr(data.dataValues.path.indexOf('static/')).split('/').slice(1, 2).join('')

          // Define the directory path where the image is stored.
          const directoryPath = path?.resolve(__dirname, '../../../uploads/')

          // Remove the image file from the directory.
          fs.unlink(directoryPath + '/' + imageName, (err) => {
            if (err) {
              handleError('Image id not found', req, res)
            }
          })
        })
        // Delete the Media entry from the database where the ID matches the provided ID.
        await Media.destroy({
          where: { id: req.params.id }
        })
        // Send a response indicating that the image was deleted successfully.
        handleResponse(res, { data: 'Image updated successfully' })
      } else {
        handleError('Image id not found', req, res)
      }
    })
  } catch (error) {
    handleError(error, req, res)
  }

  try {
    // Route to get all media files.
    router.get('/v1/admin/media', async (req, res) => {
      // Extracts query parameters from the request.
      const { page, per_page, sort } = req.query;

      // Determines the limit and offset for the database query based on pagination parameters.
      const { limit, offset } = getPagination(page, per_page)

      // Extracts sorting parameters from the request.
      const sortResponse = sortingData(req)

      // Fetches all media data from the database matching the query parameters.
      Media.findAndCountAll({
        // Filters data based on query parameters.
        where: handleSearchAndFilters(req, ['logo']),
        // Sorts data based on query parameters.
        order: [[sortResponse.sortKey, sortResponse.sortValue]],
        // Limits the number of results and applies offset for pagination.
        limit, offset,
        // Ensures only distinct rows are returned.
        distinct: true
      }).then((data) => {
        handleResponse(res, { data: getPagingResults(data, page, limit) })
      })
    })
  } catch (error) {
    handleError(error, req, res)
  }

  try {
    // Route to get a specific media file by its ID.
    router.get('/v1/admin/media/:id', async (req, res) => {

      // If ID is present, find the Media entry by its primary key (ID).
      Media.findByPk(req.params.id)
        .then(async (data) => {
          handleResponse(res, data?.dataValues ? { data: data?.dataValues } : { data: {} })
        }).catch(err => {
          handleError(err, req, res)
        })
    })
  } catch (error) {
    handleError(error, req, res)
  }

  app.use('/', router)
}