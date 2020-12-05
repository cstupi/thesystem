exports.handler = async (event) => {
    if(!event.headers){
        return {
            statusCode: 400,
            body: 'X-Forwarded-For is required'
        }
    }
    const response = {
        statusCode: 200,
        body: JSON.stringify({ ipaddress: event.headers['X-Forwarded-For']}),
    };
    return response;
};
