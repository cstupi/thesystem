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
  const date = new Date()
  if(date.getDay() == 6)
    date.setDate(date.getDate()-1)
  if(date.getDay() == 0)
    date.setDate(date.getDate()-2)
  const dateString = date.toLocaleDateString("en-US")
  const nextDay = new Date(date)
  nextDay.setDate(date.getDate()+1)
  const nextDayString = nextDay.toLocaleDateString("en-US")
  const symbol = 'SPY'
  const res = await axios.get(`https://globalrealtime.xignite.com/v3/xGlobalRealTime.json/GetBar?IdentifierType=Symbol&Identifier=${symbol}&EndTime=${dateString} 9:45 am&Precision=Minutes&Period=15&_token=${xToken}`)
  if(!res.data || !res.data.Bar) {
    console.log('Response error. Response body:', res.data)
    return
  }
  const data = { date: dateString, symbol: res.data.Identifier, high: res.data.Bar.High, low: res.data.Bar.Low }
  const highCallback = `https://www.cstupi.com/mdtrades/alert/trigger?symbol=${symbol}%26direction=high%26price=${data.high}%26resetprice=${data.low}`
  const lowCallback = `https://www.cstupi.com/mdtrades/alert/trigger?symbol=${symbol}%26direction=low%26price=${data.low}%26resetprice=${data.high}`
  const lessThan = '%3C'
  const gtThan = '%3E'
  // High
  const highRes = await axios.get(`https://alerts.xignite.com/xAlerts.json/CreateAlert?IdentifierType=Symbol&Identifier=${symbol}&API=XigniteGlobalRealTime&Condition=Last${gtThan}${data.high}&Reset=Never&CallbackURL=${highCallback}&StartDate=${dateString}&EndDate=${nextDayString}&_token=${xToken}`)
  // Low
  const lowRes = await axios.get(`https://alerts.xignite.com/xAlerts.json/CreateAlert?IdentifierType=Symbol&Identifier=${symbol}&API=XigniteGlobalRealTime&Condition=Last${lessThan}${data.low}&Reset=Never&CallbackURL=${lowCallback}&StartDate=${dateString}&EndDate=${nextDayString}&_token=${xToken}`)

  if(!highRes.data) {
    throw new Error('Failure creating high value alert')
  }
  if(!lowRes.data) {
    throw new Error('Failure creating low value alert')
  }
console.log(nextDayString, lowRes.data)
  const hookRes = await db.get({ TableName: 'Keys', Key: { id: 'slackHook' }}).promise()
  const hook = hookRes.Item
  await axios.post(hook['value'],{ 
    'text': `Symbol: ${data.symbol} for date: ${data.date} Opening 15min High: ${data.high} Opening 15min Low: ${data.low}`})
  return {
    statusCode: 204
  }
}