const axios = require('axios')
const { uuid } = require('uuidv4')
const AWS = require('aws-sdk')

exports.handler = highTriggered

async function highTriggered(event, context, callback) {
    if(!event.queryStringParameters) {
      throw new Error('Missing parameters')
    }
    const alertId = event.queryStringParameters.AlertId
    const systemid = event.queryStringParameters.SystemId
    const symbol = event.queryStringParameters.Symbol
    const direction = event.queryStringParameters.Direction
    const timestamp = event.queryStringParameters.Timestamp
    if(!alertId || !systemid || !symbol || !direction){
      throw new Error(`Missing query parameter`)
    }
    const db = new AWS.DynamoDB.DocumentClient()
    const alertRes = await db.get({TableName: 'Alerts', Key: { id: systemid }}).promise()
    const xToken = (await db.get({ TableName: 'Keys', Key: {id: 'xignite'}}).promise()).Item.value
    
    const quoteRes = await axios.get(`https://globalrealtime.xignite.com/v3/xGlobalRealTime.json/GetGlobalExtendedQuote?IdentifierType=Symbol&Identifier=${symbol}&_token=${xToken}`)
    const price = quoteRes.data.Last
    const hookRes = await db.get({ TableName: 'Keys', Key: { id: 'slackHook' }}).promise()
    const hook = hookRes.Item

    await axios.post(hook['value'],{ 
    'text': `Symbol: ${symbol} for has triggered a ${direction} event with price of ${quoteRes.data["Open"]}`})
    
    return {
      statusCode: 204   }
}