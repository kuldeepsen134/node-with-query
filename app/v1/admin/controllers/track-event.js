//Import database models
const { TrackEvent, LandingPage, sequelize, EmailLog } = require('app/models')

var ip = require('ip');

// Import utility functions and modules
const {
  handleError,
  handleResponse,
  strings,
  getPagination,
  sortingData,
  getPagingResults,
  getUseragentName,
  getOperatingSystem,
  prefixTableName,
  getCampaignDetails,
  getGeoLocation
} = require('app/utils');

//Import handleSearchAndFilters function
const { handleSearchAndFilters } = require('./helper');
const { createTrackEventSchema } = require('./campaign/validator');

const requestIp = require('request-ip');

/**
 * Export an asynchronous function named `findAll`
 * Get all track events with filters, serach, sort and pagination
 * @param req - The request object.
 * @param res - The response object.
 */
exports.findAll = (req, res) => {
  try {
    const { page, per_page } = req.query; // Extracts 'page' and 'per_page' from the query parameters

    // Calculates the 'limit' and 'offset' values for pagination
    const { limit, offset } = getPagination(page, per_page);

    // Retrieves the sort key and sort value for sorting the data
    const sortResponse = sortingData(req);

    // Finds and counts all TrackEvent instances based on search filters, sort order, limit, and offset
    TrackEvent.findAndCountAll({
      where: handleSearchAndFilters(req, ['entity_id']),
      order: [[sortResponse.sortKey, sortResponse.sortValue]], // Sets the sort order based on the sort key and sort value
      limit, offset, // Sets the limit and offset for pagination
      group: ['event'], // Add the GROUP BY clause here to group by the 'event' column
    })
      .then(data => {
        // Sends the paginated data as a response
        handleResponse(res, { data: getPagingResults(data, page, limit) });
      })
      .catch(error => {
        handleError(error, req, res);
      });
  } catch (error) {
    handleError(error, req, res);// Handle any other error that occurred
  }
}

/**
 * Export an asynchronous function named `update`
 * Update by track event ID
 * @param req - The request object.
 * @param res - The response object.
 */
exports.update = async (req, res) => {

  try {
    // Update the track event instance with the provided data
    TrackEvent.update(req.body, { where: { id: req.params.id } })
      .then(data => {
        // Check if the update operation affected 1 row
        if (data[0] === 1) {
          // Handle the successful response with a success message
          handleResponse(res, { message: strings.TrackEventUpdated });
        } else {
          // If the track event was not found, handle the error with a specific message
          handleError(strings.TrackEventNotFound, req, res);
        }
      }).catch(err => {
        // Handle any error that occurred during the update process
        handleError(err, req, res);
      });
  } catch (error) {
    // Handle any other error that occurred
    handleError(error, req, res);
  }
}

/**
 * Export an asynchronous function named `getTrackEvent`
 * Create track event open
 * @param req - The request object.
 * @param res - The response object.
 */
exports.getTrackEvent = async (req, res) => {
  // Get id by query params
  const { secret_key } = req.query;
  try {
    const entity = await EmailLog.findOne({ where: { secret_key: secret_key }, raw: true })

    const location = await getGeoLocation(requestIp.getClientIp(req))

    if (entity) {
      const data = {
        useragent_raw: req.get('user-agent'), // Extract user agent from request headers
        useragent: getUseragentName(req.get('user-agent')), // Extract user agent from request headers
        os: getOperatingSystem(req.get('user-agent')), // Extract user agent from request headers
        ip: requestIp.getClientIp(req), // // Get the IP address of the client
        event: 'open', // Set the event type as 'open'
        entity_id: entity.id, // Set the entity ID from the query params
        secret_key: secret_key,
        request_header: JSON.stringify(req.headers),
        location:JSON.stringify(location?.data || ''),
        city: location?.data?.city || '',
        state: location?.data?.state_prov || '',
        country: location?.data?.country_name || ''
      };

      // Create track event record in the database
      TrackEvent.create(data)
        .then((data) => {
          var img = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+P+f4T8AB/0C/olRY/QAAAAASUVORK5CYII=', 'base64');

          // Send response with image data
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
          });
          res.end(img);
        })
        .catch((error) => {
          handleError(error, req, res); // Handle any errors that occur during the process
        });
    }
  } catch (error) {
    handleError(error, req, res)
  }
}

/**
 * Export an asynchronous function named `createTrackEvent`
 * Create track event different type event
 * @param req - The request object.
 * @param res - The response object.
 */
exports.createTrackEvent = async (req, res) => {

  // Validate the request body using the createCampaignSchema
  const { error } = createTrackEventSchema.validate(req.body);

  // If there is a validation error, handle it and return
  if (error) {
    handleError(error, req, res);
    return;
  }
  const entity = await EmailLog.findOne({ where: { secret_key: req.body.secret_key }, raw: true })

  if (entity) {
    const campaign = await getCampaignDetails(req.body.secret_key)

    const location = await getGeoLocation(requestIp.getClientIp(req))

    const success = {
      useragent_raw: req.get('user-agent'), // Extract user agent from request headers
      useragent: getUseragentName(req.get('user-agent')), // Extract user agent from request headers
      os: getOperatingSystem(req.get('user-agent')), // Extract user agent from request headers
      ip: requestIp.getClientIp(req), // Get the IP address of the client
      event: 'success', // Set the event type from the query params
      entity_id: entity?.id, // Set the entity ID from the query params
      secret_key: req.body.secret_key,
      submitted_data: JSON.stringify(req.body.submitted_data), // Store the request body data as a string,
      request_header: JSON.stringify(req.headers),
      location:JSON.stringify(location?.data || ''),
      city: location?.data?.city || '',
      state: location?.data?.state_prov || '',
      country: location?.data?.country_name || ''
    };

    if (campaign.success_event_type === 'click' && req.body.type === 'click') {
      await TrackEvent.create(success)
    } else if (campaign.success_event_type === 'captured' && req.body.type === 'captured') {
      await TrackEvent.create(success)
    }

    const data = {
      useragent_raw: req.get('user-agent'), // Extract user agent from request headers
      useragent: getUseragentName(req.get('user-agent')), // Extract user agent from request headers
      os: getOperatingSystem(req.get('user-agent')), // Extract user agent from request headers
      ip: requestIp.getClientIp(req), // Get the IP address of the client
      event: req.body.type, // Set the event type from the query params
      entity_id: entity?.id, // Set the entity ID from the query params
      secret_key: req.body.secret_key,
      submitted_data: JSON.stringify(req.body.submitted_data), // Store the request body data as a string,
      request_header: JSON.stringify(req.headers),
      location:JSON.stringify(location?.data || ''),
      city: location?.data?.city || '',
      state: location?.data?.state_prov || '',
      country: location?.data?.country_name || ''
    };

    TrackEvent.create(data)
      .then((data) => {
        handleResponse(res, { message: strings.Captured }); // Handle the successful response
      })
      .catch((error) => {
        handleError(error, req, res); // Handle any errors that occur during the process
      });
  } else {
    handleError('Tracking secret is not valid', req, res)
  }
}

exports.getLandingPage = async (req, res) => {
  const landingPage = await LandingPage.findByPk(req.params.id)

  const html_content = landingPage?.html_content.replace(
    '</body>',
    `</body><script src="${process.env.REPORT_JS_URL}?v${Date.now()}=${Date.now()}"></script>`
  );

  handleResponse(res, { data: { html_content: html_content || '', capture_submitted_data: landingPage?.capture_submitted_data || false, capture_password: landingPage?.capture_password || false, redirect_url: landingPage?.redirect_url || '' } })
}

exports.trackLinks = async (req, res) => {
  return true
}