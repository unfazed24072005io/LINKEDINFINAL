const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { designation, location } = JSON.parse(event.body);
    
    if (!designation || !location) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Designation and location are required' })
      };
    }

    // Check environment variables
    const oxyUsername = process.env.OXYLABS_USERNAME;
    const oxyPassword = process.env.OXYLABS_PASSWORD;
    
    if (!oxyUsername || !oxyPassword) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Oxylabs credentials not configured',
          note: 'Please set OXYLABS_USERNAME and OXYLABS_PASSWORD in Netlify environment variables'
        })
      };
    }

    console.log('Making real Oxylabs API call...');
    
    // REAL OXYLABS API CALL
    const searchQuery = `site:linkedin.com/in "${designation}" "${location}"`;
    
    const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${oxyUsername}:${oxyPassword}`).toString('base64')
      },
      body: JSON.stringify({
  source: 'google_search',
  query: searchQuery,
  parse: true,
  limit: searchData.leadCount || 10  // Use the selected lead count
})
    });

    if (!response.ok) {
      throw new Error(`Oxylabs API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const profiles = extractLinkedInProfiles(data, designation, location);
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        profiles: profiles,
        count: profiles.length,
        source: 'oxylabs'
      })
    };

  } catch (error) {
    console.error('Scraping error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        error: `Scraping failed: ${error.message}` 
      })
    };
  }
};

function extractLinkedInProfiles(oxylabsData, designation, location) {
  const profiles = [];
  
  if (!oxylabsData.results || !oxylabsData.results[0]?.content?.results?.organic) {
    return profiles;
  }

  const organicResults = oxylabsData.results[0].content.results.organic;
  
  organicResults.forEach((result, index) => {
    if (result.url.includes('linkedin.com/in/')) {
      const profile = {
        id: index + 1,
        name: extractNameFromTitle(result.title),
        title: designation,
        company: 'LinkedIn Profile',
        location: location,
        profileUrl: result.url,
        email: null,
        phone: null,
        snippet: result.snippet
      };
      
      profiles.push(profile);
    }
  });

  return profiles;
}

function extractNameFromTitle(title) {
  const nameMatch = title.match(/(.*?) - (.*?) \| LinkedIn/);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1].trim();
  }
  return title.replace(' | LinkedIn', '').trim();
}