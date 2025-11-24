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
    const { designation, location, leadCount } = JSON.parse(event.body);
    
    console.log('Received search request:', { designation, location, leadCount });
    
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
    
    console.log('Environment check - Username exists:', !!oxyUsername);
    
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

    // REAL OXYLABS API CALL
    const searchQuery = `site:linkedin.com/in "${designation}" "${location}"`;
    const limit = leadCount || 10;
    
    console.log('Making REAL Oxylabs API call with query:', searchQuery);
    
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
        limit: limit,
        context: [
          { key: 'follow_redirects', value: true }
        ]
      })
    });

    console.log('Oxylabs API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Oxylabs API error:', errorText);
      throw new Error(`Oxylabs API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Oxylabs API success, data received');
    
    const profiles = extractLinkedInProfiles(data, designation, location);
    
    console.log(`Extracted ${profiles.length} LinkedIn profiles`);
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        profiles: profiles,
        count: profiles.length,
        source: 'oxylabs_real'
      })
    };

  } catch (error) {
    console.error('Scraping error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        error: `Scraping failed: ${error.message}`,
        note: 'Check your Oxylabs credentials and account status'
      })
    };
  }
};

function extractLinkedInProfiles(oxylabsData, designation, location) {
  const profiles = [];
  
  console.log('Raw Oxylabs data structure:', Object.keys(oxylabsData));
  
  if (!oxylabsData.results || !Array.isArray(oxylabsData.results) || oxylabsData.results.length === 0) {
    console.log('No results found in Oxylabs response');
    return profiles;
  }

  const firstResult = oxylabsData.results[0];
  
  if (!firstResult.content || !firstResult.content.results || !firstResult.content.results.organic) {
    console.log('No organic results found in Oxylabs response');
    return profiles;
  }

  const organicResults = firstResult.content.results.organic;
  console.log(`Found ${organicResults.length} organic results`);
  
  organicResults.forEach((result, index) => {
    if (result.url && result.url.includes('linkedin.com/in/')) {
      console.log(`Found LinkedIn profile: ${result.title}`);
      
      const profile = {
        id: index + 1,
        name: extractNameFromTitle(result.title),
        title: designation,
        company: extractCompanyFromSnippet(result.snippet) || 'LinkedIn Profile',
        location: location,
        profileUrl: result.url,
        email: null, // Will be populated by Apollo
        phone: null, // Will be populated by Apollo
        snippet: result.snippet,
        apolloEnriched: false,
        confidence: 'low'
      };
      
      profiles.push(profile);
    }
  });

  return profiles;
}

function extractNameFromTitle(title) {
  if (!title) return 'Unknown Name';
  
  // Try to extract name from common LinkedIn title formats
  const patterns = [
    /(.*?) - (.*?) \| LinkedIn/, // "John Doe - CEO | LinkedIn"
    /(.*?) \| LinkedIn/, // "John Doe | LinkedIn"
    /(.*?) on LinkedIn: (.*)/, // "John Doe on LinkedIn: Post content"
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: clean up the title
  return title.replace(' | LinkedIn', '')
             .replace(' on LinkedIn', '')
             .replace(' - LinkedIn', '')
             .trim();
}

function extractCompanyFromSnippet(snippet) {
  if (!snippet) return null;
  
  // Try to extract company from snippet
  const companyPatterns = [
    /at\s+([^.,]+)/i, // "CEO at Company Name"
    /,\s+([^.,]+)/i, // "Company Name, Location"
  ];
  
  for (const pattern of companyPatterns) {
    const match = snippet.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}