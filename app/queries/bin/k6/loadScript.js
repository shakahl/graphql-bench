import http from 'k6/http'
import { check } from 'k6'

export default function () {
  let { url, headers, query, queries, variables } = __ENV

  // Can't pass nested JSON in config file, need to parse here because stringified
  if (headers) headers = JSON.parse(headers)
  if (variables) variables = JSON.parse(variables)
  if (queries) {
    queries = JSON.parse(queries)
    // console.log(JSON.stringify(queries, null, 2))
    const randomQry = queries[Math.floor(Math.random() * queries.length)];
    query = randomQry.query
    variables = randomQry.variables || {}
  }

  // Prepare query & variables (if provided)
  let body = JSON.stringify({ query, variables })

  // Send the request
  let res = http.post(url, body, { headers })

  // Run assertions on status, errors in body, optionally results count
  check(res, {
    'is status 200': (r) => r.status === 200,
    'no error in body': (r) => Boolean(r.json('errors')) == false,
  })
}
