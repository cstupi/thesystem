const axios = require('axios')
const AWS = require('aws-sdk')

exports.handler = setHighLow

async function setHighLow() {
  const db = new AWS.DynamoDB.DocumentClient();
  const keyParams = {
    TableName: 'Keys',
    Key: {
      id: 'xignite'
    }
  }
  const dbRes = await db.get(keyParams).promise()
  const xToken = dbRes.Item.value
  const res = await axios.get(`https://alerts.xignite.com/xAlerts.json/SearchAlerts?Pattern=cstupi.com&_token=${xToken}`)
  const data = res.data

  await axios.get(`https://alerts.xignite.com/xAlerts.json/DeleteAlerts?AlertIdentifiers=${data.map(a => a.AlertIdentifier).join(',')}&_token=${xToken}`)

  return { statusCode: 204 }
}