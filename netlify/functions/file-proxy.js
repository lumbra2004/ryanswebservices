exports.handler = async function(event) {
  try {
    // Get the encoded URL from the path (after /files/)
    const path = event.path || event.rawUrl || '';
    const match = path.match(/\/files\/(.+)/);
    let encodedUrl = match ? match[1] : (event.queryStringParameters?.url || '');
    
    if (!encodedUrl) {
      return {
        statusCode: 400,
        body: 'Missing url parameter.'
      };
    }
    const fileUrl = decodeURIComponent(encodedUrl);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Failed to fetch file: ${response.statusText}`
      };
    }
    const headers = {};
    // Copy content headers
    for (const [key, value] of response.headers.entries()) {
      if (['content-type', 'content-disposition', 'content-length', 'cache-control'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      statusCode: 200,
      headers,
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: 'Proxy error: ' + err.message
    };
  }
};
