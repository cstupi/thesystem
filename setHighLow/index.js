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
  if(date.getDay() == 6)
    date.setDate(date.getDate()-1)
  if(date.getDay() == 0)
    date.setDate(date.getDate()-2)
  const dateString = date.toLocaleDateString("en-US")
  const symbol = 'SPY'
  const res = await axios.get(`https://globalrealtime.xignite.com/v3/xGlobalRealTime.json/GetBar?IdentifierType=Symbol&Identifier=${symbol}&EndTime=${dateString} 9:45 am&Precision=Minutes&Period=15&_token=${xToken['value']}`)
  if(!res.data || !res.data.Bar) {
    console.log('Response error')
    return
  }
  const data = { date: dateString, symbol: res.data.Identifier, high: res.data.Bar.High, low: res.data.Bar.Low }
  await db.delete({TableName: 'HighLows', Key: { date: dateString }}).promise()
  await db.put({TableName: 'HighLows', Item: data}).promise()
  const highParam = {
    TableName: 'Alerts',
    Item: {
      id: uuid(),
      date: new Date().toJSON(),
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
  // High
  await axios.get(`https://alerts.xignite.com/xAlerts.json/CreateAlert?IdentifierType=Symbol&Identifier=${symbol}&API=XigniteGlobalRealTime&Condition=Last%3E=${data.high}&Reset=Never&CallbackURL=https://uym7n39jz4.execute-api.us-east-1.amazonaws.com/1/alert/high?AlertId={AlertIdentifier}%26Symbol={Identifier}%26Condition={Condition}timestamp%26={timestamp}%26SystemId=${highParam.Item.id}}%26Direction=high&StartDate=${dateString}&EndDate=&_token=${xToken}`)
  // Low
  await axios.get(`https://alerts.xignite.com/xAlerts.json/CreateAlert?IdentifierType=Symbol&Identifier=${symbol}&API=XigniteGlobalRealTime&Condition=Last%3E=${data.low}&Reset=Never&CallbackURL=https://uym7n39jz4.execute-api.us-east-1.amazonaws.com/1/alert/high?AlertId={AlertIdentifier}%26Symbol={Identifier}%26Condition={Condition}Timestamp%26={timestamp}%26SystemId=${lowParam.Item.id}}%26Direction=low&StartDate=${dateString}&EndDate=&_token=${xToken}`)
  // Save for history
  await db.put(highParam).promise()
  await db.put(lowParam).promise()
  const hookRes = await db.get({ TableName: 'Keys', Key: { id: 'slackHook' }}).promise()
  const hook = hookRes.Item
  await axios.post(hook['value'],{ 
    'text': `Symbol: ${data.symbol} for date: ${data.date} Opening 15min High: ${data.high} Opening 15min Low: ${data.low}`})
  return {
    statusCode: 204
  }
}