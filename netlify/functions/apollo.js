const fetch = require('node-fetch');

exports.handler = async function(event, context) {
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
    const { profiles } = JSON.parse(event.body);

    if (!profiles || !Array.isArray(profiles)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Profiles array is required' })
      };
    }

    const apolloApiKey = process.env.APOLLO_API_KEY;
    
    if (!apolloApiKey || apolloApiKey === 'your_actual_apollo_key_here') {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          profiles: profiles.map(profile => ({
            ...profile,
            apolloEnriched: false,
            confidence: 'low',
            note: 'Add APOLLO_API_KEY for contact enrichment'
          })),
          note: 'APOLLO_API_KEY environment variable required for contact enrichment'
        })
      };
    }

    // REAL APOLLO API INTEGRATION
    console.log('Using REAL Apollo API for contact enrichment');
    
    const enrichedProfiles = [];
    
    for (const profile of profiles.slice(0, 10)) { // Limit to avoid rate limits
      try {
        // Search for person in Apollo
        // In netlify/functions/apollo.js, enhance the search with industry context
const searchResponse = await fetch('https://api.apollo.io/v1/mixed_people/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': apolloApiKey
  },
  body: JSON.stringify({
    q_keywords: `"${profile.name}" "${profile.title}" "${profile.location}" "${profile.industry}"`,
    page: 1,
    per_page: 1,
    organization_industries: [profile.industry] // Use industry for better matching
  })
});

        if (!searchResponse.ok) {
          throw new Error(`Apollo API error: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        
        if (searchData.people && searchData.people.length > 0) {
          const apolloPerson = searchData.people[0];
          
          enrichedProfiles.push({
            ...profile,
            apolloEnriched: true,
            apolloId: apolloPerson.id,
            verifiedEmail: apolloPerson.email || null,
            directPhone: apolloPerson.phone_numbers?.[0]?.sanitized_number || null,
            company: apolloPerson.organization?.name || profile.company,
            confidence: calculateConfidence(apolloPerson),
            apolloUrl: `https://app.apollo.io/#/people/${apolloPerson.id}`,
            lastRefreshed: apolloPerson.updated_at,
            hasEmail: !!apolloPerson.email,
            hasDirectPhone: !!apolloPerson.phone_numbers?.length
          });
        } else {
          // No Apollo match found
          enrichedProfiles.push({
            ...profile,
            apolloEnriched: false,
            confidence: 'low',
            note: 'No contact data found in Apollo'
          });
        }
      } catch (error) {
        console.error(`Apollo error for ${profile.name}:`, error);
        enrichedProfiles.push({
          ...profile,
          apolloEnriched: false,
          apolloError: error.message
        });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        profiles: enrichedProfiles,
        count: enrichedProfiles.length,
        source: 'apollo_real'
      })
    };

  } catch (error) {
    console.error('Apollo function error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        error: `Apollo enrichment failed: ${error.message}` 
      })
    };
  }
};

function calculateConfidence(apolloPerson) {
  let score = 0;
  if (apolloPerson.email) score += 3;
  if (apolloPerson.phone_numbers?.length > 0) score += 2;
  if (apolloPerson.organization) score += 1;
  
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}