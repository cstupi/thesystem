const axios = require('axios')
const AWS = require('aws-sdk')
exports.handler = triggerSystemAlert

async function triggerSystemAlert(event, context, callback) {
    if(!event.queryStringParameters) {
      throw new Error('Missing parameters')
    }
    console.log('Query params: ', event.queryStringParameters)
    const symbol = event.queryStringParameters.symbol
    const direction = event.queryStringParameters.direction
    const price = event.queryStringParameters.price
    const resetprice = event.queryStringParameters.resetprice
    if(!symbol || !direction || !price){
      throw new Error(`Missing query parameter`)
    }
    const db = new AWS.DynamoDB.DocumentClient()
    const xToken = (await db.get({ TableName: 'Keys', Key: {id: 'xignite'}}).promise()).Item.value
    
    const quoteRes = await axios.get(`https://globalrealtime.xignite.com/v3/xGlobalRealTime.json/GetGlobalExtendedQuote?IdentifierType=Symbol&Identifier=${symbol}&_token=${xToken}`)
    const hookRes = await db.get({ TableName: 'Keys', Key: { id: 'slackHook' }}).promise()
    const hook = hookRes.Item
    
    await axios.post(hook['value'],{ 
    'text': `Symbol: ${symbol} for has triggered a ${direction} event with price of ${quoteRes.data["Last"]}`})
    
    
    // Setup a trigger to reset itself
    const date = new Date()
    if(date.getDay() == 6)
      date.setDate(date.getDate()-1)
    if(date.getDay() == 0)
      date.setDate(date.getDate()-2)
    const dateString = date.toLocaleDateString("en-US")
    const nextDay = new Date(date)
    nextDay.setDate(date.getDate()+1)
    const nextDayString = nextDay.toLocaleDateString("en-US")
    let cb = `https://www.cstupi.com/mdtrades/alert/reset?symbol=${symbol}%26direction=${direction}%26price=${price}%26resetprice=${resetprice}`
    let condition = direction == "high" ? `Last%3C${resetprice}` : `Last%3E${resetprice}`
    let response = await axios.get(`https://alerts.xignite.com/xAlerts.json/CreateAlert?IdentifierType=Symbol&Identifier=${symbol}&API=XigniteGlobalRealTime&Condition=${condition}&Reset=Never&CallbackURL=${cb}&StartDate=${dateString}&EndDate=${nextDayString}&_token=${xToken}`)
    return { statusCode: 204   }
}