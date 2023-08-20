// This is a utility function to handle search and filters for different routes
exports.handleSearchAndFilters = (req, fields) => {
  const { Op } = require('sequelize')
  const { filters, q } = req.query
  const query = []

  // If a query string "q" is provided, create a search query for the fields
  q && query.push({
    [Op.or]: fields.map((key) => {
      return {
        [key]: {
          [Op.iLike]: `%${q}%` // Case-insensitive like query
        }
      }
    })
  })

  // Add filters for each provided column
  for (var key in filters) {
    if (key !== 'tag_ids' && key !== 'department_ids' && req.path !== '/breaches') {
      const myArray = filters[key]?.split(",")
      if (myArray[0].length > 0) {
        // Create an OR query for each filter value
        query.push({
          [Op.or]: myArray.map((item) => { return { [key]: item } })
        })
      }
    }
  }

  // Campaign id add filter in campaign/:id/email-logs
  if (req.path === `/campaigns/${req.params.id}/email-logs`) {
    query.push({
      campaign_id: {
        [Op.eq]: `${req.params.id}` // Filter by campaign ID
      }
    })
  }

  // Special handling for the company admin API
  if (req.path === `/companies/${req.params.company_id}/admins`) {
    // If no role filter is provided, filter by default roles
    if (!filters?.role) {
      query.push({
        role: { [Op.in]: ['administrator', 'super_administrator', 'manager'] },
        company_id: {
          [Op.eq]: `${req.params.company_id}` // Filter by company ID
        }
      })
    }
  }

  // By default, filter by "active" status (except for specific routes)
  if (req.path !== '/assignments' && req.path !== '/categories' && req.path !== '/companies' && req.path !== '/dark-web' && req.path !== '/members' && req.path !== '/news-tips' && req.path !== '/logs' && req.path !== '/trainings' && req.path !== '/breaches/history' && req.path !=='/breaches' && req.path !== '/courses' && req.path !== '/users' && req.path !== '/v1/admin/media' && req.path !== '/domains' && req.path !== '/campaigns' && req.path !== '/track-events' && req.path !== '/user-agents' && req.path !== '/ip-filters' && req.path !== `/campaigns/${req.params.id}/email-logs` && req.path !== `/campaigns/${req.params.id}/events-summary` && req.path !== `/courses`) {
    query.push({
      status: {
        [Op.eq]: `active`
      }
    })
  }

  //Filter add company_id null and without null
  if (req.path === '/courses' || req.path === '/assignments' || req.path === '/campaigns' || req.path === '/sending-profiles' || req.path === '/landing-pages' || req.path === '/email-templates') {
    if (req.headers.role === 'administrator') {
      query.push({
        [Op.or]: [{
          company_id: {
            [Op.eq]: req.headers.company_id
          }
        },
        {
          company_id: {
            [Op.is]: null
          }
        }
        ]
      });
    }
  }

  if (req.path === `/campaigns/${req.params.id}/email-logs`) {
    if (req.headers.role === 'administrator' || req.headers.role === 'manager') {
      query.push({
        campaign_id: {
          [Op.eq]: `${req.params.id}`
        }
      })
    }
  }

  // Filter by company ID for certain routes
  if (req.path === '/users' || req.path === '/companies' || req.path === `/groups/${req.params.id}/users`) {
    if (req.headers.role === 'administrator' || req.headers.role === 'manager') {
      // Special handling for the companies route
      if (req.path === '/companies') {
        query.push({
          id: {
            [Op.eq]: `${req.headers.company_id}`
          }
        })
      } else {
        query.push({
          company_id: {
            [Op.eq]: `${req.headers.company_id}`
          }
        })
      }
    }
  }

  // Return the completed query object
  return query
}


// This function generates a filter for a database query based on the request parameters
exports.queryFilter = (req) => {
  // Extract filters from the request query
  const { filters } = req.query

  // Iterate over each filter
  for (let key in filters) {
    // If the filter key is 'tag_id' and the length of its value is greater than 35
    if (key === 'tag_ids' || key === 'department_ids') {
      // Split the tag ids into an array
      const myArray = filters[key]?.split(",").map(item => item.trim());

      /**
       * Return a string of the tag ids, each surrounded by single quotes, and separated by commas.
       * This could be used in a SQL IN clause.
       * Note: This is vulnerable to SQL injection if `filters[key]` is user input. Consider using parameterized queries instead.
       */
      return myArray.map(id => `'${id}'`).join(',')
    }
  }
}