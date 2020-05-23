const axios = require('axios')
exports.handler = getQuote

async function getQuote(event, context, callback) {
        if(!event.queryStringParameters.symbol || !event.queryStringParameters.end || !event.queryStringParameters.token)
            throw new Error('Missing arguments')
        const res = await axios.get(`https://globalrealtime.xignite.com/v3/xGlobalRealTime.json/GetBar?IdentifierType=Symbol&Identifier=${event.queryStringParameters.symbol}&EndTime=${event.queryStringParameters.end}&Precision=Minutes&Period=15&_token=${event.queryStringParameters.token}`)
        
        if(res.data) {
            const data = res.data
            let date = new Date()
            date.setHours(data.Bar.UTCOffset)
            return {
                "isBase64Encoded": false,
                "statusCode": 200,
                "body": JSON.stringify({ symbol: data.Identifier, high: data.Bar.High, low: data.Bar.Low, asOf: date })
            } 
        }
      
        return {
                "isBase64Encoded": false,
                "statusCode": 204
            } 
}