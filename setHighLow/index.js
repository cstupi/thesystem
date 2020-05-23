const axios = require('axios')
const {uuid} = require('uuidv4')
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
  const xToken = dbRes.Item
  const date = new Date()
  date.setDate(date.getDate()-1)
  const res = await axios.get(`https://globalrealtime.xignite.com/v3/xGlobalRealTime.json/GetBar?IdentifierType=Symbol&Identifier=SPY&EndTime=${date.toLocaleDateString("en-US")} 9:45 am&Precision=Minutes&Period=15&_token=${xToken['value']}`)
  if(!res.data || !res.data.Bar) {
    console.log('Response error')
    return
  }
  const data = { symbol: res.data.Identifier, high: res.data.Bar.High, low: res.data.Bar.Low }
  
  const highParam = {
    TableName: 'Alerts',
    Item: {
      id: uuid(),
      date: new Date(),
      condition: `Last>=${data.high}`
    }
  }
  const lowParam = {
    TableName: 'Alerts',
    Item: {
      id: uuid(),
      date: new Date().toJSON(),
      condition: `Last<=${data.low}`
    }
  }
  await db.put(highParam).promise()
  await db.put(lowParam).promise()
  const hookRes = await db.get({ TableName: 'Keys', Key: { id: 'slackHook' }}).promise()
  const hook = hookRes.Item
  await axios.post(hook['value'],{ 
    'text': `Symbol: ${data.symbol} for date: ${date.toLocaleDateString("en-US")} Opening 15min High: ${data.high} Opening 15min Low: ${data.low}`})
  return
}