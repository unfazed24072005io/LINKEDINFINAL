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
      // If no real Apollo key, use enhanced mock data
      const enriched = profiles.map((profile, index) => {
        const hasContact = index < Math.min(3, profiles.length); // First 3 get "contact data"
        return {
          ...profile,
          apolloEnriched: hasContact,
          verifiedEmail: hasContact ? `${profile.name.toLowerCase().replace(/\s+/g, '.')}@company.com` : null,
          directPhone: hasContact ? `+1-555-${100 + index}-${1000 + index}` : null,
          confidence: hasContact ? 'high' : 'low',
          apolloUrl: hasContact ? `https://app.apollo.io/#/people/${profile.id}` : null,
          hasEmail: hasContact,
          hasDirectPhone: hasContact,
          note: !apolloApiKey ? 'Add APOLLO_API_KEY for real contact data' : 'Using demo contact data'
        };
      });
      
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          profiles: enriched,
          note: 'Add APOLLO_API_KEY environment variable for real contact enrichment'
        })
      };
    }

    // REAL APOLLO API INTEGRATION
    console.log('Using real Apollo API with key:', apolloApiKey.substring(0, 10) + '...');
    
    const enrichedProfiles = [];
    
    for (const profile of profiles.slice(0, 10)) { // Limit to avoid rate limits
      try {
        // Search for person in Apollo
        const searchResponse = await fetch('https://api.apollo.io/v1/mixed_people/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apolloApiKey
          },
          body: JSON.stringify({
            q_keywords: `"${profile.name}" ${profile.title} ${profile.company}`,
            page: 1,
            per_page: 1,
            reveal_personal_emails: true,
            reveal_phone_numbers: true
          })
        });

        if (!searchResponse.ok) {
          throw new Error(`Apollo search error: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        
        if (searchData.people && searchData.people.length > 0) {
          const apolloPerson = searchData.people[0];
          
          // Get detailed contact information
          let email = apolloPerson.email;
          let phone = apolloPerson.phone_numbers?.[0]?.sanitized_number;
          
          // If no direct email/phone, try to get from additional sources
          if (!email && apolloPerson.personal_emails && apolloPerson.personal_emails.length > 0) {
            email = apolloPerson.personal_emails[0];
          }
          
          enrichedProfiles.push({
            ...profile,
            apolloEnriched: true,
            apolloId: apolloPerson.id,
            verifiedEmail: email,
            directPhone: phone,
            company: apolloPerson.organization?.name || profile.company,
            confidence: calculateConfidence(apolloPerson),
            apolloUrl: `https://app.apollo.io/#/people/${apolloPerson.id}`,
            lastRefreshed: apolloPerson.updated_at,
            hasEmail: !!email,
            hasDirectPhone: !!phone,
            source: 'apollo_live'
          });
        } else {
          // No Apollo match
          enrichedProfiles.push({
            ...profile,
            apolloEnriched: false,
            confidence: 'low',
            note: 'No Apollo match found'
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
        source: 'apollo_live'
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
  if (apolloPerson.updated_at) {
    const daysAgo = (new Date() - new Date(apolloPerson.updated_at)) / (1000 * 60 * 60 * 24);
    if (daysAgo < 30) score += 1;
  }
  
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}