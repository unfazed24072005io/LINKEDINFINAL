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
    
    console.log('Apollo API Key present:', !!apolloApiKey);
    
    // If no real Apollo key, use enhanced mock data
    if (!apolloApiKey || apolloApiKey === '5ESQT2-f3ArLCtgWeH6snw') {
      console.log('Using enhanced mock data - no real Apollo key');
      
      const enriched = profiles.map((profile, index) => {
        const hasContact = index < Math.min(5, profiles.length);
        const nameSlug = profile.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
        
        return {
          ...profile,
          apolloEnriched: hasContact,
          verifiedEmail: hasContact ? `${nameSlug}@company.com` : null,
          directPhone: hasContact ? `+1-555-${100 + index}-${1000 + index}` : null,
          confidence: hasContact ? 'high' : 'low',
          hasEmail: hasContact,
          hasDirectPhone: hasContact,
          note: 'Add real APOLLO_API_KEY for actual contact data'
        };
      });
      
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          profiles: enriched,
          note: 'Add real APOLLO_API_KEY in Netlify environment variables for actual contact enrichment'
        })
      };
    }

    // REAL APOLLO ENRICHMENT API INTEGRATION
    console.log('Using REAL Apollo Enrichment API');
    
    const enrichedProfiles = [];
    
    for (const profile of profiles.slice(0, 10)) {
      try {
        console.log(`Enriching profile: ${profile.name}`);
        
        // Use the CORRECT People Enrichment endpoint
        const enrichmentResponse = await fetch('https://api.apollo.io/api/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apolloApiKey
          },
          body: JSON.stringify({
            // Use the correct parameters from the documentation
            first_name: extractFirstName(profile.name),
            last_name: extractLastName(profile.name),
            organization_name: profile.company,
            linkedin_url: profile.profileUrl,
            reveal_personal_emails: true,
            reveal_phone_number: true,
            webhook_url: '' // Add your webhook URL if you want phone numbers
          })
        });

        console.log(`Enrichment response status: ${enrichmentResponse.status}`);
        
        if (!enrichmentResponse.ok) {
          throw new Error(`Apollo enrichment error: ${enrichmentResponse.status}`);
        }

        const enrichmentData = await enrichmentResponse.json();
        console.log('Enrichment data received:', !!enrichmentData.person);
        
        if (enrichmentData.person) {
          const apolloPerson = enrichmentData.person;
          
          enrichedProfiles.push({
            ...profile,
            apolloEnriched: true,
            apolloId: apolloPerson.id,
            verifiedEmail: apolloPerson.email,
            directPhone: apolloPerson.phone_number || getPhoneFromPerson(apolloPerson),
            company: apolloPerson.organization_name || profile.company,
            title: apolloPerson.title || profile.title,
            confidence: calculateEnrichmentConfidence(apolloPerson),
            hasEmail: !!apolloPerson.email,
            hasDirectPhone: !!apolloPerson.phone_number,
            source: 'apollo_enrichment',
            matchQuality: 'high'
          });
          
          console.log(`✅ Successfully enriched ${profile.name}`);
        } else {
          // Fallback to search if enrichment fails
          console.log('Enrichment failed, trying search fallback...');
          const searchResult = await tryApolloSearch(profile, apolloApiKey);
          enrichedProfiles.push(searchResult);
        }
      } catch (error) {
        console.error(`Apollo error for ${profile.name}:`, error.message);
        enrichedProfiles.push({
          ...profile,
          apolloEnriched: false,
          apolloError: error.message,
          note: 'Apollo API error'
        });
      }
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        profiles: enrichedProfiles,
        count: enrichedProfiles.length,
        source: 'apollo_enrichment',
        enrichedCount: enrichedProfiles.filter(p => p.apolloEnriched).length
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

// Helper functions
function extractFirstName(fullName) {
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

function extractLastName(fullName) {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

function getPhoneFromPerson(person) {
  if (person.phone_number) return person.phone_number;
  if (person.phone_numbers && person.phone_numbers.length > 0) {
    return person.phone_numbers[0].sanitized_number;
  }
  return null;
}

function calculateEnrichmentConfidence(person) {
  let score = 0;
  if (person.email) score += 3;
  if (person.phone_number) score += 2;
  if (person.organization_name) score += 1;
  if (person.title) score += 1;
  
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

// Fallback search function
async function tryApolloSearch(profile, apiKey) {
  try {
    const searchResponse = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        q_keywords: `${profile.name} ${profile.company} ${profile.title}`,
        page: 1,
        per_page: 1
      })
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.people && searchData.people.length > 0) {
        const person = searchData.people[0];
        return {
          ...profile,
          apolloEnriched: true,
          verifiedEmail: person.email,
          directPhone: person.phone_numbers?.[0]?.sanitized_number,
          confidence: 'medium',
          source: 'apollo_search_fallback'
        };
      }
    }
  } catch (error) {
    console.error('Search fallback failed:', error);
  }
  
  return {
    ...profile,
    apolloEnriched: false,
    note: 'No contact data found'
  };
}