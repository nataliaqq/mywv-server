const express = require('express')
const axios = require('axios')
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const { makeExecutableSchema } = require('graphql-tools')
const bodyParser = require('body-parser');

const cors = require('cors')

var app = express()

app.use(cors())

const typeDefs = `
  type Query {
    posts(page: Int, number: Int, search: String): Posts
    post(id: Int!): Post
  }

  type Posts {
    posts: [Post],
    total: Int
  }

  type Post {
    title: String,
    image: String,
    date: String,
    id: Int
  }
`

const resolvers = {
  Query: { 
    posts: async (_, { page, number, search }) => {

      let query = createQuery({
        page,
        number,
        search
      })

      let response = await axios.get(wpURI + '/posts/?' + query)
    
      return {
        total: response.data.found,
        posts: response.data.posts.map(post => ({
          ...post,
          id: post.ID,
          image: post.post_thumbnail.URL
        }))
      }
    },

    post: async (_, { id }) => {
      let response = await axios.get(wpURI + '/posts/' + id)
      let post = response.data
      return {...post, id: post.ID, image: post.featured_image}
    }
  }
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
})

// The GraphQL endpoint
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema: schema }));

// GraphiQL, a visual editor for queries
app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));  

// RESTFUL API IS DEPRECATED. IT'S RECCOMEND TO USE GRAPHQL ENDPOINTS
app.get('/', function (req, res, next) {
  res.json({msg: 'This is CORS-enabled for all origins!'})
})

app.get('/posts', async function (req, res, next) {
    var query = createQuery({
        number: req.query.number,
        page: req.query.page,
        search: req.query.search
    })

    let response = await axios.get(wpURI + '/posts/?' + query)
    return res.send(cleanStringify(response.data))
})

app.get('/posts/:id', async function (req, res, next) {
    let response = await axios.get(wpURI + '/posts/' + req.params.id)
    return res.send(cleanStringify(response.data))
})

app.listen(process.env.PORT || 4000)

const wpURI = 'https://public-api.wordpress.com/rest/v1.1/sites/mywindowview530920213.wordpress.com'

const createQuery = (params) => { 
  var esc = encodeURIComponent
  var query = Object.keys(params)
    .filter(k => params[k])
    .map(k => esc(k) + '=' + esc(params[k]))
    .join('&&')
  return query
}

const cleanStringify = (object) => {
  if (object && typeof object === 'object') {
      object = copyWithoutCircularReferences([object], object)
  }
  return JSON.stringify(object);

  function copyWithoutCircularReferences(references, object) {
      var cleanObject = {}
      Object.keys(object).forEach(function(key) {
          var value = object[key]
          if (value && typeof value === 'object') {
              if (references.indexOf(value) < 0) {
                  references.push(value)
                  if (value instanceof Array) {
                      cleanObject[key] = []
                      value.forEach(item => cleanObject[key].push(copyWithoutCircularReferences(references, item)))
                  } else {
                      cleanObject[key] = copyWithoutCircularReferences(references, value)
                  }
                  references.pop()
              } else {
                  cleanObject[key] = '###_Circular_###'
              }
          } else if (typeof value !== 'function') {
              cleanObject[key] = value
          }
      })
      return cleanObject
  }
}