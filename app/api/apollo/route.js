import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { profiles } = await request.json();

    if (!profiles || !Array.isArray(profiles)) {
      return NextResponse.json(
        { success: false, error: 'Profiles array is required' },
        { status: 400 }
      );
    }

    // Real Apollo.io API integration
    const enrichedProfiles = await enrichWithRealApollo(profiles);
    
    return NextResponse.json({
      success: true,
      profiles: enrichedProfiles,
      count: enrichedProfiles.length,
      source: 'apollo'
    });

  } catch (error) {
    console.error('Apollo enrichment error:', error);
    return NextResponse.json(
      { success: false, error: `Apollo enrichment failed: ${error.message}` },
      { status: 500 }
    );
  }
}

async function enrichWithRealApollo(profiles) {
  const enriched = [];
  
  for (const profile of profiles.slice(0, 10)) { // Limit to avoid rate limits
    try {
      // Real Apollo.io API call
      const apolloData = await searchRealApollo(profile);
      
      if (apolloData.person) {
        enriched.push({
          ...profile,
          apolloEnriched: true,
          apolloId: apolloData.person.id,
          verifiedEmail: apolloData.person.email || null,
          directPhone: apolloData.person.phone_numbers?.[0]?.sanitized_number || null,
          company: apolloData.person.organization?.name || profile.company,
          confidence: calculateConfidence(apolloData.person),
          apolloUrl: `https://app.apollo.io/#/people/${apolloData.person.id}`,
          lastRefreshed: apolloData.person.last_updated,
          hasEmail: !!apolloData.person.email,
          hasDirectPhone: apolloData.person.phone_numbers?.length > 0 ? "Yes" : "No",
          locationData: {
            city: !!apolloData.person.city,
            state: !!apolloData.person.state,
            country: !!apolloData.person.country
          }
        });
      } else {
        // No Apollo match found
        enriched.push({
          ...profile,
          apolloEnriched: false,
          confidence: 'low'
        });
      }
    } catch (error) {
      console.error(`Apollo error for ${profile.name}:`, error);
      enriched.push({
        ...profile,
        apolloEnriched: false,
        apolloError: error.message
      });
    }
  }
  
  return enriched;
}

async function searchRealApollo(profile) {
  // Real Apollo.io API call - you need to get API key from Apollo
  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
  
  if (!APOLLO_API_KEY) {
    throw new Error('Apollo API key not configured');
  }

  const response = await fetch('https://api.apollo.io/v1/people/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': APOLLO_API_KEY
    },
    body: JSON.stringify({
      first_name: profile.name.split(' ')[0],
      last_name: profile.name.split(' ').slice(1).join(' '),
      organization_name: profile.company,
      title: profile.title
    })
  });

  if (!response.ok) {
    throw new Error(`Apollo API error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

function calculateConfidence(apolloPerson) {
  let score = 0;
  
  if (apolloPerson.email) score += 2;
  if (apolloPerson.phone_numbers?.length > 0) score += 2;
  if (apolloPerson.organization) score += 1;
  if (apolloPerson.last_updated) {
    const daysAgo = (new Date() - new Date(apolloPerson.last_updated)) / (1000 * 60 * 60 * 24);
    if (daysAgo < 30) score += 1;
  }
  
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}