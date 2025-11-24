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
    
    if (!apolloApiKey) {
      // If no Apollo key, return profiles with enrichment flags but no real data
      const enriched = profiles.map(profile => ({
        ...profile,
        apolloEnriched: false,
        confidence: 'low',
        note: 'Apollo API key not configured'
      }));
      
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          profiles: enriched,
          note: 'Add APOLLO_API_KEY environment variable for real enrichment'
        })
      };
    }

    // REAL APOLLO API INTEGRATION
    const enrichedProfiles = [];
    
    for (const profile of profiles.slice(0, 5)) { // Limit to avoid rate limits
      try {
        const apolloResponse = await fetch('https://api.apollo.io/v1/mixed_people/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apolloApiKey
          },
          body: JSON.stringify({
            q_keywords: `"${profile.name}" "${profile.title}"`,
            page: 1,
            per_page: 1
          })
        });

        if (!apolloResponse.ok) {
          throw new Error(`Apollo API error: ${apolloResponse.status}`);
        }

        const apolloData = await apolloResponse.json();
        
        if (apolloData.people && apolloData.people.length > 0) {
          const apolloPerson = apolloData.people[0];
          enrichedProfiles.push({
            ...profile,
            apolloEnriched: true,
            apolloId: apolloPerson.id,
            verifiedEmail: apolloPerson.email || null,
            directPhone: apolloPerson.phone_numbers?.[0]?.sanitized_number || null,
            company: apolloPerson.organization?.name || profile.company,
            confidence: 'high',
            apolloUrl: `https://app.apollo.io/#/people/${apolloPerson.id}`,
            lastRefreshed: apolloPerson.last_updated,
            hasEmail: !!apolloPerson.email,
            hasDirectPhone: apolloPerson.phone_numbers?.length > 0 ? "Yes" : "No"
          });
        } else {
          enrichedProfiles.push({
            ...profile,
            apolloEnriched: false,
            confidence: 'low'
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
        source: 'apollo'
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